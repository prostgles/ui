import { expect, test } from "@playwright/test";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { appendFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";

test("database tools select one array element with scoped read access", async () => {
  const config = {
    id: "db-tool-select-test",
    tableConfig: {
      notices: {
        columns: { id: "integer PRIMARY KEY", pages: "text[]", secret: "text" },
      },
    },
  };
  const configPath = createConfigTestProject(
    config,
    test.info().outputPath("config"),
  );
  const deployment = await createTestDeployment({
    configPath,
    configId: config.id,
    logPath: test.info().outputPath("deployment.log"),
    seed: async ({ projectDatabase }) => {
      await projectDatabase.query(
        "INSERT INTO notices VALUES (1, ARRAY['First page', 'Second page'], 'secret'), (2, ARRAY['Other notice'], 'hidden')",
      );
    },
  });
  try {
    const state = await deployment.connectStateAs("admin");
    const connection = await state.db.connections!.findOne({ name: config.id });
    await state.sql!(
      "INSERT INTO llm_credentials (provider_id, api_key, user_id) SELECT 'OpenAI', 'unused-test-key', id FROM users WHERE username = 'admin'",
    );
    const chat = await state.db.llm_chats!.insert(
      {
        user_id: (await state.db.users!.findOne({ username: "admin" }))!.id,
        connection_id: connection!.id,
        db_data_permissions: {
          mode: "custom",
          tablePermissions: {
            notices: {
              select: {
                fields: { id: 1, pages: 1 },
                forcedFilter: { $and: [{ fieldName: "id", value: 1 }] },
              },
            },
          },
        },
      },
      { returning: "*" },
    );
    const toolUseId = "read-page";
    const toolName = "db--find";
    await state.db.llm_messages!.insertMany([
      {
        chat_id: chat.id,
        total_tokens: 0,
        message: [
          { type: "tool_use", id: toolUseId, name: toolName, input: {} },
        ],
      },
      {
        chat_id: chat.id,
        total_tokens: 0,
        message: [
          {
            type: "tool_result",
            tool_use_id: toolUseId,
            tool_name: toolName,
            content: "Pending",
          },
        ],
      },
    ]);
    const run = (args: Record<string, unknown>) =>
      state.methods!.reRunMCPServerTool!({
        chatId: chat.id,
        serverName: "db",
        toolName: "find",
        reRunToolUseId: toolUseId,
        args,
      });
    const readPageArgs = {
      tableName: "notices",
      filter: {},
      select: { page_text: { $array_element: ["pages", 2] } },
    };
    const page = await run(readPageArgs);
    expect(page.isError, JSON.stringify(page)).not.toBe(true);
    expect(page.content).toEqual([
      { type: "text", text: JSON.stringify([{ page_text: "Second page" }]) },
    ]);
    const allFields = await run({ tableName: "notices", filter: {} });
    expect(allFields.isError).not.toBe(true);
    expect(allFields.content).toEqual([
      {
        type: "text",
        text: JSON.stringify([{ id: 1, pages: ["First page", "Second page"] }]),
      },
    ]);
    const stringWildcard = await run({
      tableName: "notices",
      filter: {},
      select: "*",
    });
    expect(stringWildcard.isError).toBe(true);
    const hiddenRow = await run({
      tableName: "notices",
      filter: { id: 2 },
      select: { page_text: { $array_element: ["pages", 1] } },
    });
    expect(hiddenRow.isError).not.toBe(true);
    expect(hiddenRow.content).toEqual([{ type: "text", text: "[]" }]);
    const hiddenColumn = await run({
      tableName: "notices",
      filter: {},
      select: { value: { $column: ["secret"] } },
    });
    expect(hiddenColumn.isError).toBe(true);
    await state.db.mcp_servers!.update({ name: "db" }, { enabled: false });
    const disabledServer = await run(readPageArgs);
    expect(disabledServer).toMatchObject({
      isError: true,
      structuredContent: { message: "MCP server db not enabled" },
    });
    await state.db.mcp_servers!.update({ name: "db" }, { enabled: true });
    expect(await run(readPageArgs)).toEqual(page);
  } finally {
    await deployment.dispose();
  }
});

test("agents use the default model and retain scoped database access without a client request", async () => {
  const responses = [
    { name: "db--find", args: { tableName: "notices", filter: {} } },
    { name: "db--find", args: { tableName: "notices", select: { secret: 1 } } },
    { name: "agent_goal_reached", args: { done: true } },
  ];
  let requestCount = 0;
  const provider = createServer((req, res) => {
    req.resume();
    const next = responses[requestCount++];
    res.writeHead(next ? 200 : 500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        next ?
          {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    {
                      id: `tool-${requestCount}`,
                      type: "function",
                      function: {
                        name: next.name,
                        arguments: JSON.stringify(next.args),
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }
        : { error: "Unexpected LLM request" },
      ),
    );
  });
  await new Promise<void>((resolve) =>
    provider.listen(0, "127.0.0.1", resolve),
  );
  const address = provider.address();
  if (!address || typeof address === "string")
    throw new Error("Missing provider port");
  const config = {
    id: "requestless-agent-test",
    tableConfig: {
      notices: { columns: { id: "integer PRIMARY KEY", secret: "text" } },
    },
  };
  const configPath = createConfigTestProject(
    config,
    test.info().outputPath("config"),
  );
  const runtimePath = resolve(__dirname, "../../../server/dist/server/src");
  appendFileSync(
    join(configPath, "index.js"),
    `
    module.exports.functions = {
      admin: { userFilter: { type: "admin" }, functions: {
        runAgent: { run: async (_, { context }) => {
          const { statePrgl } = require(${JSON.stringify(join(runtimePath, "init/startProstgles"))});
          const { connectionManager } = require(${JSON.stringify(join(runtimePath, "index"))});
          const connection = await statePrgl.db.connections.findOne({ name: ${JSON.stringify(config.id)} });
          const { prgl } = connectionManager.getConnectionStartedInstance(connection.id);
          const prostgles = prgl.db.notices.dboBuilder.prostgles;
          const execution = prostgles.getExecution();
          return prostgles.runWithExecution({ ...execution, clientReq: undefined }, () => context.startAgent({
            name: "Requestless agent", prompt: "Read the permitted notice",
            tools: { db: { find: 1 } }, autoApproveAllTools: true, timeout: 15000,
            outputSchema: { done: { type: "boolean" } },
            databaseAccess: { mode: "custom", tablePermissions: {
              notices: { select: { fields: { id: 1 }, forcedFilter: { $and: [{ fieldName: "id", value: 1 }] } } },
            } },
          }));
        } },
      } },
    };
  `,
  );
  let deployment: Awaited<ReturnType<typeof createTestDeployment>> | undefined;
  try {
    deployment = await createTestDeployment({
      configPath,
      configId: config.id,
      logPath: test.info().outputPath("deployment.log"),
      seed: async ({ projectDatabase, stateDatabase }) => {
        await projectDatabase.query(
          "INSERT INTO notices VALUES (1, 'secret'), (2, 'hidden')",
        );
        await stateDatabase.query(
          "INSERT INTO llm_models (provider_id, name, mcp_tool_support) VALUES ('OpenAI', 'luna-latest', true)",
        );
        await stateDatabase.query(
          "UPDATE llm_providers SET api_url = $1 WHERE id = 'OpenAI'",
          [`http://127.0.0.1:${address.port}/completions`],
        );
        await stateDatabase.query(
          "INSERT INTO llm_credentials (provider_id, api_key, user_id) SELECT 'OpenAI', 'unused-test-key', id FROM users WHERE username = 'admin'",
        );
      },
    });
    const project = await deployment.connectProjectAs("admin");
    expect(await project.methods!.runAgent!()).toEqual({ done: true });
    expect(requestCount).toBe(3);
    const state = await deployment.connectStateAs("admin");
    const calls = await state.db.mcp_server_tool_calls!.find(
      {},
      { orderBy: { called_at: 1 } },
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]!.output).toMatchObject({
      content: [{ type: "text", text: '[{"id":1}]' }],
    });
    expect(calls[1]!.output).toMatchObject({ isError: true });
  } finally {
    await deployment?.dispose();
    await new Promise<void>((resolve, reject) =>
      provider.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
