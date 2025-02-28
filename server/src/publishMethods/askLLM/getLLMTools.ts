import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { DBS } from "../..";

type Args = {
  published_methods: DBSSchema["published_methods"][];
  dbs: DBS;
};
export const getLLMTools = async ({ published_methods, dbs }: Args) => {
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
      name: `${t.server_name}____${t.name}`,
      description: t.description ?? "",
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
  return [...mcpTools, ...serverSideFuncTools];
};
