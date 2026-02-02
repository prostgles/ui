import { isDefined } from "@common/filterUtils";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import type { DBS } from "src/dashboard/Dashboard/DBS";

export const setChatPrompt = async ({
  dbs,
  chatId,
  prompt: { id, options },
}: {
  dbs: DBS;
  chatId: number;
  prompt: Pick<DBSSchema["llm_prompts"], "id" | "options">;
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
  const mcpServersAndTools = getEntries(mcp_server_tools || {});
  if (mcpServersAndTools.length) {
    const allowedToolsInsert = await Promise.all(
      mcpServersAndTools.flatMap(async ([server_name, toolList]) => {
        const tools = await dbs.mcp_server_tools.find({
          server_name,
          name: toolList === "*" ? undefined : { $in: toolList },
        });
        return tools.flatMap(({ id }) => {
          return {
            chat_id: chatId,
            server_name,
            tool_id: id,
          } satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"];
        });
      }),
    ).then((arr) => arr.flat());
    await dbs.llm_chats_allowed_mcp_tools.insert(allowedToolsInsert);
  }
};
