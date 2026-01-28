import { getProstglesMCPFullToolName } from "@common/prostglesMcp";
import type { DBS } from "@src/index";
import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";
import type { MCPToolSchema } from "../getLLMToolsAllowedInThisChat";

export const getPublishedMethodsTools = async (
  dbs: DBS,
  { chatId, connectionId }: { chatId: number; connectionId: string },
) => {
  const published_methods = await dbs.published_methods.find({
    connection_id: connectionId,
    $existsJoined: {
      llm_chats_allowed_functions: {
        chat_id: chatId,
      },
    },
  });
  const serverSideFuncTools = published_methods.map((m) => {
    const { name, description, arguments: _arguments, id } = m;
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
      id,
      tool_name: name,
      name: getProstglesMCPFullToolName("prostgles-db-methods", name),
      description,
      input_schema: getJSONBSchemaAsJSONSchema(
        "published_methods",
        "arguments",
        {
          type: properties,
        },
      ),
    } satisfies MCPToolSchema & { id: number; tool_name: string };
  });
  return { serverSideFuncTools, published_methods };
};
