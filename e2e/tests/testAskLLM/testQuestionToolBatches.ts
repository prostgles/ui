import { createServer } from "node:http";
import type { Page } from "@playwright/test";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { expect, test } from "../utils/fixtures";
import { makeToolUse, type ToolUse } from "./utils";

export const testQuestionToolBatches = async (page: Page) => {
  const requests: ProviderRequest[] = [];
  let responses: ToolUse[] = [];
  const provider = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      requests.push(JSON.parse(body));
      const nextResponse = responses.shift();
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  nextResponse ? nextResponse.content : "Batch completed",
                tool_calls: nextResponse?.tool,
              },
            },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) =>
    provider.listen(0, "127.0.0.1", resolve),
  );
  let deployment: TestDeployment | undefined;
  try {
    const address = provider.address();
    if (!address || typeof address === "string")
      throw new Error("No provider port");
    const configId = "question-batches-e2e";
    deployment = await createTestDeployment({
      configId,
      configPath: createConfigTestProject({ id: configId, tableConfig: {} }),
      logPath: test.info().outputPath("question-batches-server.log"),
      seed: async ({ stateDatabase }) => {
        await stateDatabase.query(
          "UPDATE llm_providers SET api_url = $1 WHERE id = 'OpenRouter'",
          [`http://127.0.0.1:${address.port}/chat/completions`],
        );
        await stateDatabase.query(`
          INSERT INTO llm_models (name, provider_id, context_length, pricing_info)
          VALUES ('question-batches-test', 'OpenRouter', 1000000, '{"input":0,"output":0}');
          INSERT INTO llm_credentials (provider_id, user_id, api_key)
          SELECT 'OpenRouter', id, 'test-key' FROM users WHERE username = 'admin';
        `);
      },
    });
    const { db, sql, methods } = await deployment.connectStateAs("admin");
    const user = await db.users!.findOne({ username: "admin" });
    const connection = await db.connections!.findOne({ name: configId });
    const model = await db.llm_models!.findOne({
      name: "question-batches-test",
    });
    const prompt = await db.llm_prompts!.findOne({ name: "Chat" });
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);

    for (const scenario of [
      "approval-before-answers",
      "approval-after-answers",
      "approval-concurrent",
      "concurrent-answers",
      "previous-message",
      "previous-user-message",
      "failed-compaction",
      "denied-compaction",
      "interrupted-compaction",
    ] as const) {
      await test.step(scenario, async () => {
        requests.length = 0;
        const needsToolApproval = scenario.startsWith("approval-");
        const questionCount =
          (
            scenario === "approval-before-answers" ||
            scenario === "concurrent-answers" ||
            scenario === "interrupted-compaction"
          ) ?
            2
          : 1;
        const questions = Array.from({ length: questionCount }, (_, index) =>
          makeToolUse("prostgles-ui", "ask_user_questions", {
            questions: [
              {
                type: "choice",
                question: index ? "How often?" : "Which colour?",
                suggestedAnswers:
                  index ? ["Weekly", "Monthly"] : ["Blue", "Red"],
              },
            ],
          }),
        );
        const compaction = makeToolUse("prostgles-ui", "compact_context", {
          type:
            scenario.startsWith("previous-") ? "previous-message" : (
              "conversation"
            ),
          summary:
            scenario === "failed-compaction" ? 123 : "Earlier context summary",
        });
        const metadata = makeToolUse("prostgles-ui", "get_tables_metadata", {
          tableNames: [],
        });
        const batch =
          scenario === "approval-after-answers" ?
            [compaction, ...questions, metadata]
          : [...questions, compaction, metadata];
        const previousCalls = Array.from({ length: 2 }, () =>
          makeToolUse("prostgles-ui", "get_tables_metadata", {
            tableNames: [],
          }),
        );
        responses = [
          ...(scenario === "previous-message" ? [{ tool: previousCalls }] : []),
          { tool: batch, content: "Please answer these questions" },
        ];
        const chat = await db.llm_chats!.insert(
          {
            name: scenario,
            user_id: user!.id,
            connection_id: connection!.id,
            model: model!.id,
            llm_prompt_id: prompt!.id,
          },
          { returning: "*" },
        );
        const earlierUserText = [
          "Keep the original requirements",
          "And constraints",
        ];
        await db.llm_messages!.insert({
          chat_id: chat.id,
          user_id: user!.id,
          total_tokens: 0,
          message: earlierUserText.map((text) => ({ type: "text", text })),
        });
        await sql!(
          `INSERT INTO llm_messages (chat_id, user_id, message, total_tokens)
           VALUES ($1, NULL, $2, 0)`,
          [
            chat.id,
            JSON.stringify([
              { type: "text", text: "Earlier assistant response" },
            ]),
          ],
        );
        await sql!(
          `INSERT INTO llm_chats_allowed_mcp_tools (chat_id, server_name, tool_id, auto_approve)
           SELECT $1, server_name, id, CASE name
             WHEN 'compact_context' THEN $2 WHEN 'get_tables_metadata' THEN $3 ELSE true END
           FROM mcp_server_tools WHERE server_name = 'prostgles-ui'
             AND name IN ('ask_user_questions', 'compact_context', 'get_tables_metadata')
           ON CONFLICT (chat_id, tool_id) DO UPDATE SET auto_approve = EXCLUDED.auto_approve`,
          [chat.id, scenario !== "denied-compaction", !needsToolApproval],
        );
        await page.goto(deployment!.dashboardUrl);
        await page.getByTestId("AskLLM").click();
        const sendMessage = async (text: string) => {
          await page.getByTestId("Chat.textarea").fill(text);
          await page.getByTestId("Chat.send").click();
        };
        await sendMessage("Original request that must survive compaction");
        await expect(page.getByTestId("AskUserQuestions.confirm")).toHaveCount(
          questionCount,
        );
        await expect(page.getByTestId("Chat.textarea")).toBeEnabled();
        const requestCountBeforeAnswers =
          scenario === "previous-message" ? 2 : 1;
        expect(requests).toHaveLength(requestCountBeforeAnswers);

        const respondToApproval = async (response: "approve" | "deny") => {
          const approvals = await db.mcp_tool_approval_requests!.find({
            chat_id: chat.id,
          });
          expect(approvals).toHaveLength(1);
          await methods!.approveToolUse!({
            id: approvals[0]!.id,
            response,
            schema: "",
          });
        };
        if (scenario === "approval-before-answers")
          await respondToApproval("approve");
        if (scenario === "denied-compaction") await respondToApproval("deny");
        if (scenario === "approval-after-answers") {
          await page
            .getByRole("dialog")
            .filter({ has: page.getByTestId("AskLLMToolApprover.AllowOnce") })
            .getByTestId("Popup.close")
            .click();
        }
        expect(requests).toHaveLength(requestCountBeforeAnswers);

        if (
          scenario === "concurrent-answers" ||
          scenario === "approval-concurrent"
        ) {
          await Promise.all([
            ...questions.map((question, index) =>
              methods!.askLLM!({
                chatId: chat.id,
                connectionId: connection!.id,
                schema: "",
                type: "tool-use-result",
                userMessage: [
                  {
                    type: "tool_result",
                    tool_use_id: question.id,
                    tool_name: question.function.name,
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify([
                          {
                            question: index ? "How often?" : "Which colour?",
                            answers: [index ? "Weekly" : "Blue"],
                          },
                        ]),
                      },
                    ],
                  },
                ],
              }),
            ),
            ...(scenario === "approval-concurrent" ?
              [respondToApproval("approve")]
            : []),
          ]);
        }
        for (let index = 0; index < questionCount; index++) {
          if (
            scenario === "concurrent-answers" ||
            scenario === "approval-concurrent"
          )
            break;
          if (index && scenario === "interrupted-compaction") break;
          const question = page.getByTestId("AskUserQuestions").nth(index);
          await question
            .getByRole("button", {
              name: index ? "Weekly" : "Blue",
              exact: true,
            })
            .click();
          await question.getByTestId("AskUserQuestions.confirm").click();
          await expect(
            question.getByTestId("AskUserQuestions.confirm"),
          ).toHaveCount(0);
          if (
            index < questionCount - 1 ||
            (needsToolApproval && scenario === "approval-after-answers")
          ) {
            expect(requests).toHaveLength(requestCountBeforeAnswers);
          }
        }
        if (scenario === "approval-after-answers")
          await respondToApproval("approve");
        if (
          scenario === "denied-compaction" ||
          scenario === "interrupted-compaction"
        ) {
          expect(requests).toHaveLength(requestCountBeforeAnswers);
          await sendMessage("Continue without compaction");
        }
        await expect(page.getByTestId("Chat.messageList")).toContainText(
          "Batch completed",
        );
        await expect
          .poll(() => requests.length)
          .toBe(requestCountBeforeAnswers + 1);

        const lastRequest = requests.at(-1)!;
        const requestedToolIds = lastRequest.messages.flatMap(
          (message) => message.tool_calls?.map(({ id }) => id) ?? [],
        );
        const returnedToolIds = lastRequest.messages.flatMap((message) =>
          message.role === "tool" ? [message.tool_call_id] : [],
        );
        expect(returnedToolIds.sort()).toEqual(requestedToolIds.sort());
        expect(new Set(returnedToolIds).size).toBe(returnedToolIds.length);
        const sentContext = JSON.stringify(lastRequest.messages);
        const sentUserText = JSON.stringify(
          lastRequest.messages.filter((message) => message.role === "user"),
        );
        expect(sentUserText).toContain(
          "Original request that must survive compaction",
        );
        for (const [index, question] of questions.entries()) {
          if (index && scenario === "interrupted-compaction") break;
          expect(
            lastRequest.messages.find(
              (message) => message.tool_call_id === question.id,
            )?.content,
          ).toContain(
            JSON.stringify({
              question: index ? "How often?" : "Which colour?",
              answers: [index ? "Weekly" : "Blue"],
            }),
          );
        }
        const compactionSucceeded =
          needsToolApproval ||
          scenario.startsWith("previous-") ||
          scenario === "concurrent-answers";
        for (const text of earlierUserText) {
          expect(sentUserText.includes(text)).toBe(
            !compactionSucceeded || scenario.startsWith("previous-"),
          );
        }
        expect(requestedToolIds.includes(compaction.id)).toBe(
          !compactionSucceeded,
        );
        if (compactionSucceeded) {
          expect(sentContext.split("Earlier context summary")).toHaveLength(
            scenario === "previous-user-message" ? 1 : 2,
          );
          if (scenario === "previous-message") {
            expect(
              lastRequest.messages.find(
                (message) => message.tool_call_id === previousCalls[0]!.id,
              )?.content,
            ).toBe(
              "This message has been compacted to reduce context length. Summary: Earlier context summary",
            );
            expect(
              lastRequest.messages.find(
                (message) => message.tool_call_id === previousCalls[1]!.id,
              )?.content,
            ).toBe("Compacted.");
          } else if (scenario !== "previous-user-message") {
            expect(sentContext).not.toContain("Earlier assistant response");
          }
        } else {
          expect(sentContext).not.toContain(
            "Previous messages have been compacted",
          );
        }

        const storedMessages = await db.llm_messages!.find(
          { chat_id: chat.id },
          { orderBy: { created: 1 } },
        );
        const batchIndex = storedMessages.findIndex(({ message }) =>
          message.some(
            (item) => item.type === "tool_use" && item.id === compaction.id,
          ),
        );
        const storedResults = storedMessages[batchIndex + 1]!.message;
        expect(
          storedResults
            .map((item) => item.type === "tool_result" && item.tool_use_id)
            .sort(),
        ).toEqual(batch.map(({ id }) => id).sort());
        expect(
          storedResults.find(
            (item) =>
              item.type === "tool_result" && item.tool_use_id === compaction.id,
          ),
        ).toMatchObject({ is_error: !compactionSucceeded });
        expect(
          await db.mcp_tool_approval_requests!.count({ chat_id: chat.id }),
        ).toBe(needsToolApproval || scenario === "denied-compaction" ? 1 : 0);
        expect(
          await db.mcp_server_tool_calls!.count({
            chat_id: chat.id,
            mcp_tool_name: "get_tables_metadata",
          }),
        ).toBe(
          scenario === "interrupted-compaction" ? 0
          : scenario === "previous-message" ? 3
          : 1,
        );
      });
    }

    await test.step("questions resume the LLM when combined with an actionable tool", async () => {
      const chat = await db.llm_chats!.findOne(
        { connection_id: connection!.id },
        { orderBy: { created: -1 } },
      );
      if (!chat) throw new Error("Question batch chat not found");
      await sql!(
        `INSERT INTO llm_chats_allowed_mcp_tools (chat_id, server_name, tool_id, auto_approve)
         SELECT $1, server_name, id, true FROM mcp_server_tools
         WHERE server_name = 'prostgles-ui' AND name = 'create_dashboards'`,
        [chat.id],
      );
      const question = makeToolUse("prostgles-ui", "ask_user_questions", {
        questions: [
          { type: "choice", question: "Continue?", suggestedAnswers: ["Yes"] },
        ],
      });
      const dashboards = makeToolUse("prostgles-ui", "create_dashboards", {
        prostglesWorkspaces: [],
      });
      requests.length = 0;
      responses = [{ tool: [question, dashboards] }];
      await page
        .getByTestId("Chat.textarea")
        .fill("Ask before suggesting dashboards");
      await page.getByTestId("Chat.send").click();
      const questionForm = page
        .getByTestId("AskUserQuestions")
        .filter({ hasText: "Continue?" });
      await questionForm
        .getByRole("button", { name: "Yes", exact: true })
        .click();
      await questionForm.getByTestId("AskUserQuestions.confirm").click();
      await expect.poll(() => requests.length).toBe(2);
      expect(
        requests[1]!.messages.find(
          (message) => message.tool_call_id === question.id,
        )?.content,
      ).toContain("Yes");
      expect(
        requests[1]!.messages.find(
          (message) => message.tool_call_id === dashboards.id,
        ),
      ).toBeDefined();
      await expect(page.getByTestId("Chat.textarea")).toBeEnabled();
    });
  } finally {
    await deployment?.dispose();
    await new Promise<void>((resolve, reject) =>
      provider.close((error) => {
        if (error) reject(error);
        else resolve();
      }),
    );
  }
};

type ProviderRequest = {
  messages: {
    role: string;
    content: unknown;
    tool_calls?: ToolUse["tool"];
    tool_call_id?: string;
  }[];
};
