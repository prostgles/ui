import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { fixIndent } from "@common/utils";
import { getJSONBSchemaTSTypes } from "prostgles-types";

const name = "suggest_tools_and_prompt" as const;
export const getSuggestToolsSchema = ({
  availableDBTools,
  availableMCPTools,
}: {
  availableMCPTools: { name: string; description: string }[];
  availableDBTools: { name: string; description: string }[];
}) => ({
  name,
  description: fixIndent(`
    This tool will update the user chat context with suggests tools and prompt.
    The input will be shown to the user for confirmation.
    
    Available MCP tools: 
    ${!availableMCPTools.length ? "None" : availableMCPTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}

    Available database tools:
    ${!availableDBTools.length ? "None" : availableDBTools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}

    If access to the database is needed, an access type can be specified. 
    Use the most restrictive access type that is needed to complete the task (type custom with specific tables and allowed commands).

    This tool input_schema must satisfy this typescript type:
    \`\`\`typescript
    ${getJSONBSchemaTSTypes(
      PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][name].schema,
      {},
      undefined,
      [],
    )}
    \`\`\`
  `),
  input_schema: {},
});
