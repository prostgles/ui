import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";
import { DBS } from "..";
import { fetchMCPToolsList } from "./AnthropicMcpHub/fetchMCPToolsList";
import type { McpHub } from "./AnthropicMcpHub/McpHub";
import { type McpTool } from "./AnthropicMcpHub/McpTypes";
import { startMcpHub } from "./AnthropicMcpHub/startMcpHub";
import { getProstglesMCPServer } from "./ProstglesMcpHub/ProstglesMCPServers";
import type { ProstglesMcpServerDefinition } from "./ProstglesMcpHub/ProstglesMCPServerTypes";
export const getSchemasAsJsonSchema = ({
  schema,
  outputSchema,
}: {
  schema: JSONB.FieldTypeObj | undefined;
  outputSchema: JSONB.FieldType | undefined;
}) => {
  const getJsonbAsJsonSchema = (schema: JSONB.FieldType | undefined) =>
    schema &&
    (getJSONBSchemaAsJSONSchema(
      "",
      "",
      typeof schema === "string" ? { type: schema } : schema,
    ) as McpTool["outputSchema"]);

  return {
    inputSchema: getJsonbAsJsonSchema(schema) as McpTool["inputSchema"],
    outputSchema: getJsonbAsJsonSchema(outputSchema) as McpTool["inputSchema"],
  };
};
export const updateMcpServerTools = async (
  dbs: DBS,
  serverName: string,
  mcpHub: McpHub,
) => {
  let tools: (McpTool & {
    mode: DBSSchema["mcp_server_tools"]["mode"];
  })[] = [];
  const prostglesMCP = getProstglesMCPServer(serverName);
  if (prostglesMCP) {
    tools = getEntries(
      prostglesMCP.definition.tools as ProstglesMcpServerDefinition["tools"],
    ).map(([name, { schema, description, mode = null, outputSchema }]) => {
      return {
        name,
        description,
        mode,
        ...getSchemasAsJsonSchema({ schema, outputSchema }),
      };
    });
  } else {
    const client = mcpHub.getClient(serverName);
    if (!client) {
      throw new Error(
        `No connection found for MCP server: ${serverName}. Make sure it is enabled`,
      );
    }
    tools = (await fetchMCPToolsList(client)).map((tool) => {
      return {
        ...tool,
        mode: null,
      };
    });
  }

  await dbs.tx(async (tx) => {
    await tx.mcp_server_tools
      .delete({
        server_name: serverName,
        name: { $nin: tools.map((t) => t.name) },
      })
      .catch((e) => {
        console.error(
          `Error deleting MCP server tools for server ${serverName}:`,
          e,
        );
      });
    if (tools.length) {
      await tx.mcp_server_tools.insert(
        tools.map(
          ({
            name,
            description,
            inputSchema,
            annotations,
            title,
            _meta,
            execution,
            icons,
            outputSchema,
            mode,
          }) =>
            ({
              description: description ?? "",
              server_name: serverName,
              inputSchema,
              outputSchema,
              name,
              annotations,
              mode,
            }) satisfies DBSSchemaForInsert["mcp_server_tools"],
        ),
        {
          onConflict: "DoUpdate",
        },
      );
    }
  });
  // const   resources = await fetchMCPResourcesList(client);
  return tools.length;
};

export const reloadMcpServerTools = async (dbs: DBS, serverName: string) => {
  const mcpHub = await startMcpHub(dbs);
  return updateMcpServerTools(dbs, serverName, mcpHub);
};
