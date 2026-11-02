import assert from "node:assert/strict";
import { test } from "node:test";
import { llmChatsAllowedMcpToolsTableHooks } from "./llm_chats_allowed_mcp_tools.tableHooks";

void test("mixed upsert hook batches configure only their affected rows", async () => {
  const validate = llmChatsAllowedMcpToolsTableHooks.llm_chats_allowed_mcp_tools!.afterAll![0]!.validate;
  const input = [
    { chat_id: 1, tool_id: 10, server_name: "inserted-server", server_config_id: null },
    { chat_id: 1, tool_id: 20, server_name: "updated-server", server_config_id: null },
  ];
  for (const [index, command] of (["insert", "update"] as const).entries()) {
    const row = input[index]!;
    const queriedServers: string[][] = [];
    const linkedTools: unknown[] = [];
    const enabledServers: string[][] = [];
    const dbx = {
      mcp_servers: {
        find: (filter: { name: { $in: string[] } }) => {
          queriedServers.push(filter.name.$in);
          return Promise.resolve(filter.name.$in.map((name) => ({
            name,
            config_schema: { endpoint: { type: "local", defaultValue: "localhost" } },
          })));
        },
        update: (filter: { name: { $in: string[] } }) => {
          enabledServers.push(filter.name.$in);
          return Promise.resolve();
        },
      },
      mcp_server_configs: {
        findOne: () => Promise.resolve(undefined),
        insert: () => Promise.resolve({ id: 42 }),
      },
      llm_chats_allowed_mcp_tools: {
        update: (filter: unknown, data: unknown) => {
          linkedTools.push({ filter, data });
          return Promise.resolve();
        },
      },
    };
    const invoke = (rows: typeof input) => validate({
      command, data: input, rows, dbx,
    } as unknown as Parameters<typeof validate>[0]);

    await invoke([row]);
    assert.deepEqual(queriedServers, [[row.server_name]]);
    assert.deepEqual(enabledServers, [[row.server_name]]);
    assert.deepEqual(linkedTools, [{
      filter: { $or: [{ chat_id: 1, tool_id: row.tool_id, server_name: row.server_name }] },
      data: { server_config_id: 42 },
    }]);

    await invoke([]);
    assert.equal(linkedTools.length, 1);
    assert.equal(enabledServers.length, 1);
  }
});
