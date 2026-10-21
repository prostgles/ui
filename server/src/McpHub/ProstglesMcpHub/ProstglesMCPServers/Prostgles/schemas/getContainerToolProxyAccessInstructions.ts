import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { DOCKER_MCP_ENDPOINT_ENV_VAR } from "../../../../DockerSandbox/runContainerWithProxyAccess";

export const getContainerToolProxyAccessInstructions = (
  mcpTools: McpCallContextFetchTools["mcpTools"],
) => {
  const mcpToolAccessInstructions =
    !mcpTools.length ?
      "No MCP tools are available. Request access before calling MCP tools from the container."
    : [
        `Read process.env.${DOCKER_MCP_ENDPOINT_ENV_VAR} inside the running container. Its value is the complete authenticated proxy base URL, including /mcp-proxy/<secret>. Preserve that path; do not hardcode hosts, ports or secrets, append another /mcp-proxy, or resolve a leading-slash URL that discards the base path.`,
        `Append /<server_name>/<tool_name> to that value. The chat tool db--insert maps to /db/insert, not /db--insert. Use exact server/tool names from the tool list and inspect their schemas before calling. This is an HTTP JSON proxy, not an MCP JSON-RPC /mcp endpoint.`,
        `POST the tool arguments directly as the JSON body with Content-Type: application/json; do not wrap them in name/arguments, params, or a JSON-RPC envelope. For example, when db--execute_readonly_sql is allowed: curl -X POST "$${DOCKER_MCP_ENDPOINT_ENV_VAR}/db/execute_readonly_sql" -H "Content-Type: application/json" -d '{"sql":"SELECT 1"}'.`,
        `File uploads use the same /db/insert or /db/insertMany routes and JSON arguments as the normal database tools, not multipart/form-data or a separate upload route. The proxy URL is not a base URL for downloading stored files.`,
        `The response body is JSON: the tool's structuredContent when present, otherwise a JSON string for a single text result or a content fallback. Check response.ok before using await response.json(); do not assume a JSON-RPC result or MCP content wrapper.`,
        `Tool discovery does not grant access. Only tools allowed in the current chat/workflow scope can be called; calls may wait for UI approval. Request missing access from chat rather than trying alternative URLs. create_agentic_workflow must be called from chat, not from the container.`,
      ].join("\n");

  return mcpToolAccessInstructions;
};
