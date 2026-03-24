import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fromEntries, getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  type JSONB,
} from "prostgles-types";
import { getContainerToolProxyAccessInstructions } from "./getContainerToolProxyAccessInstructions";

const { run_code_in_sandbox, run_typescript_in_nodejs } =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"];

export const getContainerToolSchemas = (
  mcpTools: McpCallContextFetchTools["mcpTools"],
) => {
  const containerToolProxyAccessInstructions =
    getContainerToolProxyAccessInstructions(mcpTools);

  return fromEntries(
    getEntries({ run_code_in_sandbox, run_typescript_in_nodejs }).map(
      ([toolName, tool]) => {
        return [
          toolName,
          {
            name: toolName,
            description: `${tool.description} \n${containerToolProxyAccessInstructions}`,
            inputSchema: omitKeys(
              getJSONBSchemaAsJSONSchema("", "", tool.schema),
              ["$id", "$schema"],
            ) as McpTool["inputSchema"],
          },
        ] as const;
      },
    ),
  );
};

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;

export const createContainerSchema = PROSTGLES_MCP_SERVERS_AND_TOOLS[
  "prostgles-ui"
]["run_code_in_sandbox"].schema satisfies JSONB.JSONBSchema;
