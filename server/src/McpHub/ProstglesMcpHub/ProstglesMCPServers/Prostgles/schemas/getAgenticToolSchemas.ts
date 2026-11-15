import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fixIndent } from "@common/utils";
import type { DBS } from "@src/index";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { getJSONBSchemaAsJSONSchema, omitKeys } from "prostgles-types";
import { getDefineAgenticWorkflowTsWithDbAndMcpTypes } from "../agenticWorkflow/runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";
import { getWorkflowDeclaration } from "../agenticWorkflow/runtimeSetup/getWorkflowDeclaration";
import { WORKFLOW_MODULE_NAME } from "../agenticWorkflow/runtimeSdk/workflowConstants";
import { CHEAPER_AGENTIC_MODEL_RANKING } from "@src/serverFunctions/askLLM/refreshModels";

const name = "create_agentic_workflow" as const;
export const getAgenticWorkflowToolSchema = async ({
  availableMCPTools,
  dbs,
}: {
  availableMCPTools: McpCallContextFetchTools["mcpTools"];
  dbs: DBS;
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
    dbGeneratedSchema: undefined,
  });

  return {
    name,
    description: fixIndent(`
    This tool will allow the user to create and start an agent workflow with suggested tools and prompt.
    The input will be shown to the user for confirmation and execution.
    The "workflow_function_definition" must be an executable TypeScript entrypoint that imports defineAgenticWorkflow from "${WORKFLOW_MODULE_NAME}" and calls it at the top level. Pass the configuration as the first argument and the workflow callback as the second. Configure the tools and agent prompts needed for the workflow. The selected tools must be a subset of the available tools.
    The structure of the "workflow_function_definition" should adhere to the types below:
    ${"```typescript"}
    ${getWorkflowDeclaration(workflowTsSchema)}
    ${"```"}

    ## Database Access
    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).
 
    ## Preferred agent models: ${JSON.stringify(CHEAPER_AGENTIC_MODEL_RANKING)}
  `),
    inputSchema: getJSONBSchemaAsJSONSchema("", "", {
      type: omitKeys(args, ["workflowId"]),
    } as const) as McpTool["inputSchema"],
  };
};
