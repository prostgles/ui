import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fixIndent } from "@common/utils";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";

const name = "suggest_agentic_workflow" as const;
export const getAgenticWorkflowToolSchema = ({
  availableDBTools,
  availableMCPTools,
}: {
  availableMCPTools: { name: string; description: string }[];
  availableDBTools: { name: string; description: string }[];
}) => ({
  name,
  description: fixIndent(`
    This tool will allow the user to create and start an agent workflow with suggested tools and prompt.
    The input will be shown to the user for confirmation.
    
    ## Available MCP tools: 
    ${!availableMCPTools.length ? "None" : availableMCPTools.map((t) => JSON.stringify(t.name)).join(", ")}

    ## Available database tools:
    ${!availableDBTools.length ? "None" : availableDBTools.map((t) => JSON.stringify(t.name)).join(", ")}

    ## Database Access
    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).
 
  `),
  input_schema: getJSONBSchemaAsJSONSchema(
    "",
    "",
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][name].schema,
  ),
});
