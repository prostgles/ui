import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fixIndent } from "@common/utils";
import type { DBS } from "@src/index";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { getJSONBSchemaAsJSONSchema, omitKeys } from "prostgles-types";
import { getDefineAgenticWorkflowTsWithDbAndMcpTypes } from "../agenticWorkflow/runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";

const name = "create_agentic_workflow" as const;
export const getAgenticWorkflowToolSchema = async ({
  availableMCPTools,
  dbs,
  connection_id,
}: {
  availableMCPTools: McpCallContextFetchTools["mcpTools"];
  dbs: DBS;
  connection_id: string;
}) => {
  const toolsByServer = new Map<string, string[]>();

  availableMCPTools.forEach((tool) => {
    const serverTools = toolsByServer.get(tool.server_name) || [];
    serverTools.push(tool.name);
    toolsByServer.set(tool.server_name, serverTools);
  });

  const args =
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][name].schema.type;
  const workflowTsSchema = await getDefineAgenticWorkflowTsWithDbAndMcpTypes({
    dbs,
    purpose: "agent-prompt",
    // connection_id,
    dbGeneratedSchema: undefined,
  });
  // Database table handler definition:
  //   ${"```typescript"}
  //   ${prostglesApiTypes}
  //   ${"```"}
  return {
    name,
    description: fixIndent(`
    This tool will allow the user to create and start an agent workflow with suggested tools and prompt.
    The input will be shown to the user for confirmation and execution.
    The "workflow_function_definition" should be the definition of the function that will be created to execute the agentic workflow. It should include the tools that should be used in the workflow and the prompt that should be given to the agent to execute the workflow. The tools included in the "workflow_function_definition" must be a subset of the available tools listed below.
    The structure of the "workflow_function_definition" should adhere to the types below:
    ${"```typescript"}
    ${workflowTsSchema} 
    ${"```"}

    ## Database Access
    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).
 
  `),
    inputSchema: getJSONBSchemaAsJSONSchema("", "", {
      type: omitKeys(args, ["workflowId"]),
    } as const) as McpTool["inputSchema"],
  };
};
