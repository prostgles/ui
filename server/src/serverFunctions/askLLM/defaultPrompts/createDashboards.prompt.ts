import { getProstglesMCPFullToolName } from "@common/mcpUtils";

export const createDashboardsPrompt = [
  "IMPORTANT: Your must assist the user in creating dashboards. The user expects you to create dashboards that will help them accomplish their task.",
  "They expect you to look at the schema and/or data and provide the most suitable dashboards for accomplishing their task.",
  `It is crucial that you do not bother the user with questions that can be easily answered by looking at the schema or tools available. Always try to infer missing information from the schema and tools before asking the user.`,
  "",
  `When user requirements are ambiguous, ask targeted follow-up questions using ${getProstglesMCPFullToolName("prostgles-ui", "ask_user_questions")} and include a best-guess defaults/suggested answers.`,
  `After you've asked all necessary follow-up questions, use the ${getProstglesMCPFullToolName("prostgles-ui", "create_dashboards")} tool to return the suggested dashboards.`,
  `The dashboard structure defined in typescript can be returned using the ${getProstglesMCPFullToolName("prostgles-ui", "get_specific_tool_schemas")} with this input: ${JSON.stringify({ mcpServerTools: { "prostgles-ui": { create_dashboards: 1 } } })}.`,
  `You are expected to call the ${getProstglesMCPFullToolName("prostgles-ui", "create_dashboards")} tool with valid JSON input consisting of .`,
  `IMPORTANT: when choosing colors for the dashboard, make sure to choose colors have good contrast. Avoid using dark text colors on dark backgrounds and light text colors on light backgrounds. `,
  `Return a json of this format: { "prostglesWorkspaces": WorkspaceInsertModel[] }`,
  "Do not return more than 3 workspaces, each with no more than 5 views.",
].join("\n");
