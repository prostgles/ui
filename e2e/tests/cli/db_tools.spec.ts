import { expect, test } from "@playwright/test";
import { createTestDeployment } from "../../../server/dist/server/src/cli/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";

test("database tools select one array element with scoped read access", async () => {
  const config = {
    id: "db-tool-select-test",
    tableConfig: {
      notices: { columns: { id: "integer PRIMARY KEY", pages: "text[]", secret: "text" } },
    },
  };
  const configPath = createConfigTestProject(config, test.info().outputPath("config"));
  const deployment = await createTestDeployment({
    configPath, configId: config.id,
    logPath: test.info().outputPath("deployment.log"),
    seed: async ({ projectDatabase }) => {
      await projectDatabase.query("INSERT INTO notices VALUES (1, ARRAY['First page', 'Second page'], 'secret'), (2, ARRAY['Other notice'], 'hidden')");
    },
  });
  try {
    const state = await deployment.connectStateAs("admin");
    const connection = await state.db.connections!.findOne!({ name: config.id });
    await state.sql!(
      "INSERT INTO llm_credentials (provider_id, api_key, user_id) SELECT 'OpenAI', 'unused-test-key', id FROM users WHERE username = 'admin'",
    );
    const chat = await state.db.llm_chats!.insert!({
      connection_id: connection!.id,
      db_data_permissions: {
        mode: "custom",
        tablePermissions: {
          notices: { select: { fields: { id: 1, pages: 1 }, forcedFilter: { $and: [{ fieldName: "id", value: 1 }] } } },
        },
      },
    }, { returning: "*" });
    const toolUseId = "read-page";
    const toolName = "db--find";
    await state.db.llm_messages!.insertMany!([
      { chat_id: chat!.id, total_tokens: 0, message: [{ type: "tool_use", id: toolUseId, name: toolName, input: {} }] },
      { chat_id: chat!.id, total_tokens: 0, message: [{ type: "tool_result", tool_use_id: toolUseId, tool_name: toolName, content: "Pending" }] },
    ]);
    const run = (args: Record<string, unknown>) => state.methods!.reRunMCPServerTool!({
      chatId: chat!.id, serverName: "db", toolName: "find", reRunToolUseId: toolUseId, args,
    });
    const page = await run({ tableName: "notices", filter: {}, select: { page_text: { $array_element: ["pages", 2] } } });
    expect(page.isError).not.toBe(true);
    expect(page.content).toEqual([{ type: "text", text: JSON.stringify([{ page_text: "Second page" }]) }]);
    const allFields = await run({ tableName: "notices", filter: {} });
    expect(allFields.isError).not.toBe(true);
    expect(allFields.content).toEqual([{ type: "text", text: JSON.stringify([{ id: 1, pages: ["First page", "Second page"] }]) }]);
    const stringWildcard = await run({ tableName: "notices", filter: {}, select: "*" });
    expect(stringWildcard.isError).toBe(true);
    const hiddenRow = await run({ tableName: "notices", filter: { id: 2 }, select: { page_text: { $array_element: ["pages", 1] } } });
    expect(hiddenRow.isError).not.toBe(true);
    expect(hiddenRow.content).toEqual([{ type: "text", text: "[]" }]);
    const hiddenColumn = await run({ tableName: "notices", filter: {}, select: { value: { $column: ["secret"] } } });
    expect(hiddenColumn.isError).toBe(true);
  } finally {
    await deployment.dispose();
  }
});
