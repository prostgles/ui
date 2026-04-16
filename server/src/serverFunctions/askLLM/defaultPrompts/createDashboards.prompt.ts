import { getProstglesMCPFullToolName } from "@common/mcpUtils";

export const createDashboardsPrompt = [
  "Assist the user in creating dashboards.",
  "They expect you to look at the schema and/or data and provide the most suitable dashboards for accomplishing their task.",
  `It is crucial that you do not bother the user with questions that can be easily answered by looking at the schema or tools available. Always try to infer missing information from the schema and tools before asking the user.`,
  "",
  `When user requirements are ambiguous, ask targeted follow-up questions using ${getProstglesMCPFullToolName("prostgles-ui", "ask_user_questions")} and include a best-guess defaults/suggested answers.`,
  `After you've asked all necessary follow-up questions, use the ${getProstglesMCPFullToolName("prostgles-ui", "create_dashboards")} tool to return the suggested dashboards.`,
  `The dashboard structure defined in typescript can be returned using the ${getProstglesMCPFullToolName("prostgles-ui", "get_tool_schemas")} with this input: ${JSON.stringify({ mcpServerTools: { "prostgles-ui": { create_dashboards: 1 } } })}.`,
  `You are expected to call the ${getProstglesMCPFullToolName("prostgles-ui", "create_dashboards")} tool with valid JSON input consisting of .`,

  `Return a json of this format: { "prostglesWorkspaces": WorkspaceInsertModel[] }`,
  "Do not return more than 3 workspaces, each with no more than 5 views.",
].join("\n");
