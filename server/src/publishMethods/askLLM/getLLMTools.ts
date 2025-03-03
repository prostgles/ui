import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { DBS } from "../..";
import { getMCPFullToolName } from "../../../../commonTypes/mcp";

type Args = {
  chatId: number;
  dbs: DBS;
} & Pick<DBSSchema["llm_credentials"]["config"], "Provider">;
export const getLLMTools = async ({ dbs, Provider, chatId }: Args) => {
  const canUseTools = Provider === "Prostgles" || Provider === "Anthropic";

  const published_methods =
    canUseTools ?
      await dbs.published_methods.find({
        $existsJoined: {
          llm_chats_allowed_functions: {
            chat_id: chatId,
          },
        },
      })
    : [];

  const mcpTools = (
    await dbs.mcp_server_tools.find({
      $existsJoined: {
        mcp_servers: {
          enabled: true,
        },
      },
    })
  ).map((t) => {
    return {
      name: getMCPFullToolName(t),
      description: t.description,
      input_schema: t.inputSchema,
    };
  });
  const serverSideFuncTools = published_methods.map((m) => {
    const { name, description, arguments: _arguments } = m;
    const properties = _arguments.reduce(
      (acc, arg) => ({
        ...acc,
        [arg.name]:
          (
            arg.type === "JsonbSchema" ||
            arg.type === "Lookup" ||
            arg.type === "Lookup[]"
          ) ?
            "any"
          : arg.type,
      }),
      {} as JSONB.ObjectType["type"],
    );
    return {
      name,
      description,
      input_schema: getJSONBSchemaAsJSONSchema(
        "published_methods",
        "arguments",
        {
          type: properties,
        },
      ),
    };
  });
  const allTools = [...mcpTools, ...serverSideFuncTools];
  // if (Provider === "OpenAI") {
  //   return allTools.map(({ input_schema, ...func }) => {
  //     return {
  //       type: "function",
  //       function: func,
  //       parameters: input_schema,
  //     };
  //   });
  // }
  return allTools;
};
