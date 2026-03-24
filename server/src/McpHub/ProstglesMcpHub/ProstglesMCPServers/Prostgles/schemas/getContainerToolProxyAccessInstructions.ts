import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { DOCKER_MCP_ENDPOINT_ENV_VAR } from "../../../../DockerSandbox/runContainerWithProxyAccess";

export const getContainerToolProxyAccessInstructions = (
  mcpTools: McpCallContextFetchTools["mcpTools"],
) => {
  const mcpToolAccessInstructions =
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

  return mcpToolAccessInstructions;
};
