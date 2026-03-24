import { isDefined } from "@common/filterUtils";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import type { DBS } from "src/dashboard/Dashboard/DBS";
import { tout } from "src/utils/utils";

export const setChatPrompt = async ({
  dbs,
  chatId,
  prompt: { id, options },
  currentPrompt,
}: {
  dbs: DBS;
  chatId: number;
  prompt: Pick<DBSSchema["llm_prompts"], "id" | "options">;
  currentPrompt: DBSSchema["llm_prompts"] | undefined;
}) => {
  const { max_tokens, mcp_server_tools, temperature } = options || {};
  const res = await dbs.llm_chats.update(
    { id: chatId },
    {
      llm_prompt_id: id,
      extra_body:
        isDefined(max_tokens ?? temperature) ?
          {
            temperature,
            max_tokens,
          }
        : undefined,
    },
    {
      returning: { id: 1 },
    },
  );
  if (res?.length !== 1) {
    throw "Failed to update chat prompt";
  }
  const getTools = (opts: DBSSchema["llm_prompts"]["options"]) => {
    return Promise.all(
      getEntries(opts?.mcp_server_tools ?? {}).map(
        async ([server_name, toolList = {}]) => {
          return dbs.mcp_server_tools.find({
            server_name,
            name: { $in: Object.keys(toolList) },
          });
        },
      ),
    );
  };

  /** Disable previous tools */
  if (currentPrompt?.options?.mcp_server_tools && currentPrompt.id !== id) {
    const currentTools = await getTools(currentPrompt.options);
    if (currentTools.length) {
      await dbs.llm_chats_allowed_mcp_tools.delete({
        $or: currentTools.flat().map(
          (t) =>
            ({
              chat_id: chatId,
              tool_id: t.id,
              server_name: t.server_name,
            }) satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"],
        ),
      });
    }
  }

  /** Disable previous db access */
  if (currentPrompt?.options?.database_access && currentPrompt.id !== id) {
    await dbs.llm_chats.update({ id: chatId }, { db_data_permissions: null });
  }

  const mcpServersAndTools = getEntries(mcp_server_tools || {});
  if (mcpServersAndTools.length) {
    const allowedToolsInsert = await Promise.all(
      mcpServersAndTools.flatMap(async ([server_name, toolListObj = {}]) => {
        await dbs.mcp_servers.update({ name: server_name }, { enabled: true });
        /** Wait for tools to load if missing */
        while (!(await dbs.mcp_server_tools.count({ server_name }))) {
          await tout(500);
        }

        const toolList = Object.keys(toolListObj);
        const tools = await dbs.mcp_server_tools.find({
          server_name,
          name: { $in: toolList },
        });
        if (!tools.length || tools.length !== toolList.length) {
          throw new Error(
            `Some tools not found for MCP server ${server_name}. Expected: ${toolList}, found: ${tools.map((t) => t.name).join(", ")}`,
          );
        }
        return tools.flatMap(({ id, name }) => {
          return {
            chat_id: chatId,
            server_name,
            tool_id: id,
            auto_approve: toolListObj[name] === "auto-approve",
          } satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"];
        });
      }),
    ).then((arr) => arr.flat());
    await dbs.llm_chats_allowed_mcp_tools.insert(allowedToolsInsert, {
      onConflict: "DoNothing",
    });
  }

  if (options?.database_access) {
    await dbs.llm_chats.update(
      { id: chatId },
      {
        db_data_permissions: { mode: options.database_access },
      },
    );
  }
};
