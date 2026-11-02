import { createServer } from "node:http";
import type { Page } from "@playwright/test";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { expect, test } from "../utils/fixtures";

export const testPastedTextAttachments = async (page: Page) => {
  const requests: { messages: { role: string; content: unknown }[] }[] = [];
  const provider = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      requests.push(JSON.parse(body));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          choices: [{ message: { content: "Attachments received" } }],
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
    const savedText = "Previously saved attachment: café";
    const configId = "text-attachments-e2e";
    deployment = await createTestDeployment({
      configId,
      configPath: createConfigTestProject({
        id: configId,
        tableConfig: {},
      }),
      logPath: test.info().outputPath("text-attachments-server.log"),
      seed: async ({ stateDatabase }) => {
        await stateDatabase.query(
          "UPDATE llm_providers SET api_url = $1 WHERE id = 'OpenRouter'",
          [`http://127.0.0.1:${address.port}/chat/completions`],
        );
        await stateDatabase.query(`
          INSERT INTO llm_models (name, provider_id, context_length, pricing_info)
          VALUES ('text-attachments-test', 'OpenRouter', 1000000, '{"input":0,"output":0}');
          INSERT INTO llm_credentials (provider_id, user_id, api_key)
          SELECT 'OpenRouter', id, 'test-key' FROM users WHERE username = 'admin';
          INSERT INTO llm_chats (name, user_id, connection_id, model, llm_prompt_id)
          SELECT 'Text attachments', users.id, connections.id, llm_models.id,
            (SELECT id FROM llm_prompts WHERE name = 'Empty' LIMIT 1)
          FROM users, connections, llm_models
          WHERE users.username = 'admin' AND connections.name = '${configId}'
            AND llm_models.name = 'text-attachments-test';
        `);
        await stateDatabase.query(
          `INSERT INTO llm_messages (chat_id, user_id, message, total_tokens)
           SELECT id, user_id, $1, 0 FROM llm_chats WHERE name = 'Text attachments'`,
          [
            JSON.stringify([
              {
                type: "text",
                source: {
                  type: "base64",
                  media_type: "text/plain",
                  data: Buffer.from(savedText).toString("base64"),
                },
              },
            ]),
          ],
        );
      },
    });
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await page.getByTestId("AskLLM").click();
    const files = [
      { name: "first.txt", text: "First attachment\r\nRésumé: £42, 日本語 🐘" },
      { name: "second.txt", text: "Second attachment\nAnother line" },
      { name: "empty.txt", text: " \n\t" },
    ];
    const input = page.getByTestId("Chat.textarea");
    await expect(input).toBeEnabled();
    await input.evaluate((textarea, attachments) => {
      const clipboardData = new DataTransfer();
      for (const attachment of attachments) {
        clipboardData.items.add(
          new File([attachment.text], attachment.name, {
            type: "text/plain",
          }),
        );
      }
      textarea.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, files);
    await expect(
      page.getByTestId("ChatFileAttachments.removeFile"),
    ).toHaveCount(files.length);
    const question = "Read these text files";
    await input.fill(question);
    await page.getByTestId("Chat.send").click();
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Attachments received",
    );
    expect(requests).toHaveLength(1);
    expect(
      requests[0]!.messages.filter((message) => message.role === "user"),
    ).toEqual([
      { role: "user", content: [{ type: "text", text: savedText }] },
      {
        role: "user",
        content: [
          { type: "text", text: question },
          ...files.slice(0, 2).map(({ text }) => ({ type: "text", text })),
        ],
      },
    ]);
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
