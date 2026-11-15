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
          title: { label: "Title", show: false, width: 240 },
          body: { label: "Body" },
        },
        card: {
          headerColumn: "title",
          subHeaderColumns: ["id"],
          summaryFields: ["body"],
        },
      },
      other_table: { label: "Other table" },
    };
    expect(await updateMetadata(originalMetadata)).toEqual(originalMetadata);
    const layoutSections = [
      {
        header: "Content",
        columns: 2 as const,
        items: [
          {
            key: "body",
            columnSpan: 2 as const,
            labelPlacement: "hidden" as const,
          },
        ],
      },
    ];
    const updatedMetadata = await updateMetadata({
      notices: { card: { summaryFields: [], layoutSections } },
    });
    expect(updatedMetadata).toEqual({
      ...originalMetadata,
      notices: {
        ...originalMetadata.notices,
        card: {
          ...originalMetadata.notices.card,
          summaryFields: [],
          layoutSections,
        },
      },
    });
    expect(await updateMetadata({ notices: { card: {} } })).toEqual(
      updatedMetadata,
    );
    const replacedSections = [{ layout: "inline" as const, items: ["body"] }];
    expect(
      await updateMetadata({
        notices: {
          card: { subHeaderColumns: [], layoutSections: replacedSections },
        },
      }),
    ).toEqual({
      ...updatedMetadata,
      notices: {
        ...updatedMetadata!.notices,
        card: {
          ...updatedMetadata!.notices!.card,
          subHeaderColumns: [],
          layoutSections: replacedSections,
        },
      },
    });
    const expectRejectedMetadata = async (
      metadata: NonNullable<DBSchema["connections"]["table_options"]>,
      message: string,
    ) => {
      const before = (await db.connections!.findOne(connectionFilter))!
        .table_options;
      const result = await methods!.reRunMCPServerTool!({
        chatId: chat.id,
        serverName: "prostgles-ui",
        toolName: "set_tables_metadata",
        reRunToolUseId: toolUseId,
        args: { metadata },
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result)).toContain(message);
      expect(
        (await db.connections!.findOne(connectionFilter))!.table_options,
      ).toEqual(before);
    };
    /* Validate the merged card, including duplicates across header, summary and sections. */
    await expectRejectedMetadata(
      { notices: { card: { summaryFields: ["body"] } } },
      "is already used in this card",
    );
    await expectRejectedMetadata(
      { notices: { card: { summaryFields: ["title"] } } },
      "is already used in this card",
    );
    await expectRejectedMetadata(
      { notices: { card: { layoutSections: [{ items: ["body", "body"] }] } } },
      "is already used in this card",
    );
    await expectRejectedMetadata(
      {
        notices: {
          card: {
            layoutSections: [
              { columns: 1, items: [{ key: "body", columnSpan: 2 }] },
            ],
          },
        },
      },
      "columnSpan must be between 1 and 1",
    );
    await expectRejectedMetadata(
      { notices: { card: { layoutSections: [{ items: [""] }] } } },
      "field name cannot be empty",
    );
    expect(
      await updateMetadata({ notices: { card: { layoutSections: [] } } }),
    ).toMatchObject({
      notices: { card: { summaryFields: [], layoutSections: [] } },
    });
    expect(JSON.stringify(metadataTool)).not.toContain('"infoLevel"');
    expect(JSON.stringify(metadataTool)).toContain('"layout"');

    /* Agents can enable basic HTML without options that weaken sanitisation. */
    const htmlMetadata = await updateMetadata({
      notices: { columns: { body: { format: { type: "HTML" } } } },
    });
    expect(htmlMetadata!.notices!.columns!.body!.format).toEqual({
      type: "HTML",
    });
    expect(JSON.stringify(metadataTool)).not.toContain("noSanitize");
    expect(JSON.stringify(metadataTool)).not.toContain("allowedHTMLTags");
    expect(JSON.stringify(metadataTool)).toContain("background-color");
    expect(JSON.stringify(metadataTool)).toContain(
      "Content is clipped to its container",
    );

    /* Reject oversized summaries through MCP, direct metadata writes and CLI sync. */
    const summaryFields = Array.from(
      { length: 10 },
      (_, index) => `summary_${index}`,
    );
    await updateMetadata({ notices: { card: { summaryFields } } });
    const oversizedCard = { summaryFields: [...summaryFields, "extra"] };
    await expectRejectedMetadata(
      { notices: { card: oversizedCard } },
      "at most 10 fields",
    );
    await expect(
      db.connections!.update(connectionFilter, {
        table_options: { notices: { card: oversizedCard } },
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("at most 10 fields"),
    });
    await expect(
      db.connections!.update(connectionFilter, {
        table_options: {
          notices: { card: { summaryFields: ["body", "body"] } },
        },
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("is already used in this card"),
    });

    /* CLI configuration validates section layouts before saving them. */
    appendFileSync(
      `${configPath}/index.js`,
      `\nmodule.exports.connection = ${JSON.stringify({
        table_options: {
          notices: {
            card: { layoutSections: [{ layout: "invalid", items: ["body"] }] },
          },
        },
      })};`,
    );
    await expect(deployment.syncSchema()).rejects.toMatchObject({
      message: expect.stringContaining("layout must be grid or inline"),
    });

    appendFileSync(
      `${configPath}/index.js`,
      `\nmodule.exports.connection = ${JSON.stringify({
        table_options: { notices: { card: oversizedCard } },
      })};`,
    );
    await expect(deployment.syncSchema()).rejects.toMatchObject({
      message: expect.stringContaining("at most 10 fields"),
    });
  } finally {
    await deployment.dispose();
  }
});

test("database tools accept Prostgles params and preserve scoped access", async () => {
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
              insert: true,
              update: true,
              delete: true,
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
    const dbToolNames = [
      "find",
      "count",
      "insert",
      "insertMany",
      "update",
      "delete",
    ] as const;
    await state.db.llm_messages!.insertMany([
      {
        chat_id: chat.id,
        total_tokens: 0,
        message: dbToolNames.map((toolName) => ({
          type: "tool_use" as const,
          id: `${toolUseId}-${toolName}`,
          name: getProstglesMCPFullToolName("db", toolName),
          input: {},
        })),
      },
      {
        chat_id: chat.id,
        total_tokens: 0,
        message: dbToolNames.map((toolName) => ({
          type: "tool_result" as const,
          tool_use_id: `${toolUseId}-${toolName}`,
          tool_name: getProstglesMCPFullToolName("db", toolName),
          content: "Pending",
        })),
      },
    ]);
    const run = (
      args: Record<string, unknown>,
      toolName: (typeof dbToolNames)[number] = "find",
    ) =>
      state.methods!.reRunMCPServerTool!({
        chatId: chat.id,
        serverName: "db",
        toolName,
        reRunToolUseId: `${toolUseId}-${toolName}`,
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
    expect(stringWildcard).toEqual(allFields);
    /* Native selection and sorting forms must retain the forced row filter. */
    for (const select of [["id"], { id: true }, { pages: false }]) {
      for (const orderBy of [
        "id",
        ["id"],
        { id: -1 },
        [{ id: false }],
        { key: "id" },
        { key: "id", asc: -1 },
        { key: "id", asc: null, nulls: null, nullEmpty: true },
        [{ key: "id", asc: true, nulls: "last", nullEmpty: false }],
      ]) {
        const result = await run({ tableName: "notices", select, orderBy });
        expect(result.isError, JSON.stringify(result)).not.toBe(true);
        expect(result.structuredContent).toEqual([{ id: 1 }]);
      }
    }
    const shorthandCount = await run({
      tableName: "notices",
      select: { id: "$count" },
    });
    expect(shorthandCount.isError, JSON.stringify(shorthandCount)).not.toBe(
      true,
    );
    expect(shorthandCount).toEqual(
      await run({ tableName: "notices", select: { id: { $count: ["id"] } } }),
    );
    const groupedParams = {
      tableName: "notices",
      select: ["id"],
      groupBy: true,
      having: { id: 1 },
    };
    const groupedRows = await run(groupedParams);
    expect(groupedRows.isError, JSON.stringify(groupedRows)).not.toBe(true);
    expect(groupedRows.structuredContent).toEqual([{ id: 1 }]);
    const groupedCount = await run(groupedParams, "count");
    expect(groupedCount.isError, JSON.stringify(groupedCount)).not.toBe(true);
    expect(groupedCount.structuredContent).toBe(1);
    const filteredCount = await run(
      { ...groupedParams, having: { id: 2 } },
      "count",
    );
    expect(filteredCount.isError, JSON.stringify(filteredCount)).not.toBe(true);
    expect(filteredCount.structuredContent).toBe(0);
    for (const params of [
      { orderBy: { id: 0 } },
      { groupBy: "true" },
      { select: [1] },
    ]) {
      expect((await run({ tableName: "notices", ...params })).isError).toBe(
        true,
      );
    }
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

    /* Mutation returning forms and explicit conflict targets match the DB API. */
    for (const toolName of ["insert", "insertMany"] as const) {
      const row = { id: 1, pages: [`Changed by ${toolName}`] };
      const result = await run(
        {
          tableName: "notices",
          data: toolName === "insert" ? row : [row],
          onConflict: { action: "DoUpdate", conflictColumns: ["id"] },
          returning: toolName === "insert" ? "*" : ["id", "pages"],
          removeDisallowedFields: true,
        },
        toolName,
      );
      expect(result.isError, JSON.stringify(result)).not.toBe(true);
      expect(result.structuredContent).toEqual(
        toolName === "insert" ? { ...row, secret: "secret" } : [row],
      );
    }
    const updated = await run(
      {
        tableName: "notices",
        filter: { id: 1 },
        data: { pages: ["Updated"] },
        returning: { id: true },
        multi: false,
        removeDisallowedFields: true,
      },
      "update",
    );
    expect(updated.isError, JSON.stringify(updated)).not.toBe(true);
    expect(updated.structuredContent).toEqual({ id: 1 });
    const deleted = await run(
      {
        tableName: "notices",
        filter: { id: 1 },
        returning: ["id"],
      },
      "delete",
    );
    expect(deleted.isError, JSON.stringify(deleted)).not.toBe(true);
    expect(deleted.structuredContent).toEqual([{ id: 1 }]);
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
