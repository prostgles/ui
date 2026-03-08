import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fixIndent } from "@common/utils";
import type { McpCallContextFetchTools } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { getJSONBSchemaAsJSONSchema, omitKeys } from "prostgles-types";
import { getDefineAgenticWorkflowTsSchema } from "../getAgenticWorkflowFiles";
import type { DBS } from "@src/index";

const name = "suggest_agentic_workflow" as const;
export const getAgenticWorkflowToolSchema = async ({
  availableDBTools,
  availableMCPTools,
  dbs,
}: {
  availableMCPTools: McpCallContextFetchTools["mcpTools"];
  availableDBTools: { name: string; description: string }[];
  dbs: DBS;
}) => {
  const toolsByServer = new Map<string, string[]>();

  availableMCPTools.forEach((tool) => {
    const serverTools = toolsByServer.get(tool.server_name) || [];
    serverTools.push(tool.name);
    toolsByServer.set(tool.server_name, serverTools);
  });

  // ## Available MCP servers and their tools:
  // ${
  //   !toolsByServer.size ? "None" : (
  //     Array.from(toolsByServer.entries())
  //       .map(([server, tools]) => `{ ${server}: ${tools} }`)
  //       .join("\n")
  //   )
  // }

  const args =
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][name].schema.type;
  const workflowTsSchema = await getDefineAgenticWorkflowTsSchema(dbs, "agent");
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
  

    ## Available database tools:
    ${!availableDBTools.length ? "None" : availableDBTools.map((t) => JSON.stringify(t.name)).join(", ")}

    ## Database Access
    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).
 
  `),
    input_schema: getJSONBSchemaAsJSONSchema("", "", {
      type: omitKeys(args, ["workflowId"]),
    } as const),
  };
};
