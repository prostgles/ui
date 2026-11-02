import { expect, test } from "@playwright/test";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { appendFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import type { DBSchema } from "../../../common/DBGeneratedSchema";
import { getProstglesMCPFullToolName } from "../../../common/mcpUtils";

test("table metadata updates preserve omitted settings and replace arrays", async () => {
  const config = {
    id: "table-metadata-test",
    tableConfig: {
      notices: {
        columns: { id: "integer PRIMARY KEY", title: "text", body: "text" },
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
  });
  try {
    const { db, sql, methods } = await deployment.connectStateAs("admin");
    const connection = await db.connections!.findOne({ name: config.id });
    const connectionFilter = { id: connection!.id };
    await db.connections!.update(connectionFilter, { table_options: null });
    await sql!(
      "INSERT INTO llm_credentials (provider_id, api_key, user_id) SELECT 'OpenAI', 'unused-test-key', id FROM users WHERE username = 'admin'",
    );
    const chat = await db.llm_chats!.insert(
      {
        user_id: (await db.users!.findOne({ username: "admin" }))!.id,
        connection_id: connection!.id,
      },
      { returning: "*" },
    );
    const toolUseId = "update-table-metadata";
    const toolName = getProstglesMCPFullToolName(
      "prostgles-ui",
      "set_tables_metadata",
    );
    const metadataTool = await db.mcp_server_tools!.findOne({
      server_name: "prostgles-ui",
      name: "set_tables_metadata",
    });
    await db.llm_chats_allowed_mcp_tools!.insert({
      chat_id: chat.id,
      server_name: "prostgles-ui",
      tool_id: metadataTool!.id,
      auto_approve: true,
    });
    await db.llm_messages!.insertMany([
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
    const updateMetadata = async (
      metadata: NonNullable<DBSchema["connections"]["table_options"]>,
    ) => {
      const result = await methods!.reRunMCPServerTool!({
        chatId: chat.id,
        serverName: "prostgles-ui",
        toolName: "set_tables_metadata",
        reRunToolUseId: toolUseId,
        args: { metadata },
      });
      expect(result.isError, JSON.stringify(result)).not.toBe(true);
      return (await db.connections!.findOne(connectionFilter))!.table_options;
    };
    const originalMetadata = {
      notices: {
        label: "Notices",
        icon: "Text",
        columns: {
          title: { label: "Title", show: true, width: 240 },
          body: { infoLevel: 1 as const },
        },
        card: {
          headerColumn: "title",
          subHeaderColumns: ["id", "body"],
        },
      },
      other_table: { label: "Other table" },
    };
    expect(await updateMetadata(originalMetadata)).toEqual(originalMetadata);
    const layout = {
      type: "grid" as const,
      columns: 2,
      fields: { body: { columnSpan: 2, labels: "none" as const } },
    };
    expect(await updateMetadata({ notices: { card: { layout } } })).toEqual({
      ...originalMetadata,
      notices: {
        ...originalMetadata.notices,
        card: { ...originalMetadata.notices.card, layout },
      },
    });
    const updatedMetadata = await updateMetadata({
      notices: {
        label: "",
        columns: { title: { show: false }, body: { infoLevel: 2 } },
        card: {
          layout: { fields: { body: { row: 2 } } },
          subHeaderColumns: ["body"],
        },
      },
    });
    expect(updatedMetadata).toEqual({
      ...originalMetadata,
      notices: {
        ...originalMetadata.notices,
        label: "",
        columns: {
          title: { label: "Title", show: false, width: 240 },
          body: { infoLevel: 2 },
        },
        card: {
          ...originalMetadata.notices.card,
          layout: {
            ...layout,
            fields: { body: { ...layout.fields.body, row: 2 } },
          },
          subHeaderColumns: ["body"],
        },
      },
    });
    expect(await updateMetadata({ notices: { card: {} } })).toEqual(
      updatedMetadata,
    );
    const clearedMetadata = await updateMetadata({
      notices: { card: { subHeaderColumns: [] } },
    });
    expect(clearedMetadata).toEqual({
      ...updatedMetadata,
      notices: {
        ...updatedMetadata!.notices,
        card: { ...updatedMetadata!.notices!.card, subHeaderColumns: [] },
      },
    });

    /* Reject the eleventh explicit summary field, including after merged MCP updates. */
    const summaryColumns = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [
        `summary_${index}`,
        { infoLevel: 1 as const },
      ]),
    );
    await updateMetadata({ notices: { columns: summaryColumns } });
    const rejectedUpdate = await methods!.reRunMCPServerTool!({
      chatId: chat.id,
      serverName: "prostgles-ui",
      toolName: "set_tables_metadata",
      reRunToolUseId: toolUseId,
      args: { metadata: { notices: { columns: { body: { infoLevel: 1 } } } } },
    });
    expect(rejectedUpdate.isError).toBe(true);
    expect(JSON.stringify(rejectedUpdate)).toContain("at most 10 columns");
    const savedMetadata = (await db.connections!.findOne(connectionFilter))!
      .table_options;
    expect(savedMetadata!.notices!.columns!.body!.infoLevel).toBe(2);
    await expect(
      db.connections!.update(connectionFilter, {
        table_options: {
          notices: { columns: { ...summaryColumns, extra: { infoLevel: 1 } } },
        },
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("at most 10 columns"),
    });
    await updateMetadata({
      notices: {
        columns: Object.fromEntries(
          Array.from({ length: 15 }, (_, index) => [`unmarked_${index}`, {}]),
        ),
      },
    });
    appendFileSync(
      `${configPath}/index.js`,
      `\nmodule.exports.connection = ${JSON.stringify({
        table_options: {
          notices: { columns: { ...summaryColumns, extra: { infoLevel: 1 } } },
        },
      })};`,
    );
    await expect(deployment.syncSchema()).rejects.toMatchObject({
      message: expect.stringContaining("at most 10 columns"),
    });
  } finally {
    await deployment.dispose();
  }
});

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
          "UPDATE llm_providers SET api_url = $1 WHERE id = 'Prostgles'",
          [`http://127.0.0.1:${address.port}/completions`],
        );
        await stateDatabase.query(
          "INSERT INTO llm_credentials (provider_id, api_key, user_id) SELECT 'Prostgles', 'unused-test-key', id FROM users WHERE username = 'admin'",
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
