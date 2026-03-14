import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  type JSONB,
} from "prostgles-types";
import { DOCKER_MCP_ENDPOINT_ENV_VAR } from "../../../../DockerSandbox/runContainerWithProxyAccess";
import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";

const createContainerToolInfo =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["run_code_in_sandbox"];

export const getCreateContainerToolSchema = (
  mcpTools: McpCallContextFetchTools["mcpTools"],
) => {
  const databaseQueryDescription =
    !mcpTools.length ?
      "No MCP tools allowed. Must request access to MCP tools to be able to call MCP tools from the container."
    : [
        `To call mcp tools you need to POST JSON body parameters to the "${DOCKER_MCP_ENDPOINT_ENV_VAR}" environment variable endpoint.`,
        `The endpoint is in the format \`${DOCKER_MCP_ENDPOINT_ENV_VAR}/[tool_server_name]/[tool_name]\`.`,
        `Foe example, if using curl: \`curl -X POST $${DOCKER_MCP_ENDPOINT_ENV_VAR}/db/execute_sql -H "Content-Type: application/json" -d '{"sql": "SELECT * FROM users;"}'\``,
        `The following endpoints are available:\n\n`,
        // TODO: check if showing tool schemas here is useful or just adds confusion
        // ...dbTools.map((t) => {
        //   return ` - /${t.tool_name} - ${t.description} JSON body input schema: ${getJSONBTSTypes([], t.schema)}. Response schema: ${getJSONBTSTypes([], t.outputSchema)}`;
        // }),
      ].join("\n");

  return {
    name: "run_code_in_sandbox",
    description: `${createContainerToolInfo.description}. ${databaseQueryDescription}`,
    inputSchema: omitKeys(
      getJSONBSchemaAsJSONSchema("", "", createContainerSchema),
      ["$id", "$schema"],
    ) as McpTool["inputSchema"],
  };
};

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;

export const createContainerSchema = PROSTGLES_MCP_SERVERS_AND_TOOLS[
  "prostgles-ui"
]["run_code_in_sandbox"].schema satisfies JSONB.JSONBSchema;
