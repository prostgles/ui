import { LLM_PROMPT_VARIABLES } from "@common/llmUtils";
import { getProstglesMCPFullToolName } from "@common/mcpUtils";
import { type PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchemaForInsert } from "@common/publishUtils";
import { getElectronConfig } from "@src/electronConfig";
import type { DBS } from "../..";
import { createAgenticWorkflowPrompt } from "./defaultPrompts/createAgenticWorkflow.prompt";
import { setupLLMProviders } from "./setupLLMProviders";
import { createDashboardsPrompt } from "./defaultPrompts/createDashboards.prompt";
import { basePrompt } from "./defaultPrompts/base.prompt";

type UiToolName =
  keyof (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"];
const allowProstglesUITools = (
  uiTools: Partial<Record<UiToolName, 1 | "auto-approve">>,
) => ({
  "prostgles-ui": uiTools,
});

export const setupLLM = async (dbs: DBS) => {
  /** In case of stale schema update */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (dbs.llm_prompts) {
    const adminUser = await dbs.users.findOne({ passwordless_admin: true });
    const user_id = adminUser?.id;
    const upsertedPrompts = await dbs.llm_prompts.insertMany(
      [
        {
          name: "Chat",
          description: "Default chat. Includes schema (if allowed)",
          user_id,
          prompt: [
            basePrompt,
            `When asked to generate data DO NOT CREATE IT YOURSELF. USE MCP TOOLS SUCH AS ${getProstglesMCPFullToolName("prostgles-ui", "run_code_in_sandbox")} TO EITHER DOWNLOAD IT OR GENERATE THROUGH SOME PACKAGES. NEVER PROVIDE THE VALUES YOURSELF UNLESS SPECIFICALLY ASKED.`,
            "",
            LLM_PROMPT_VARIABLES.SCHEMA,
          ].join("\n"),
          options: {
            mcp_server_tools: allowProstglesUITools({
              ask_user_questions: 1,
              request_tool_access: 1,
              get_specific_tool_schemas: "auto-approve",
              get_tool_list: "auto-approve",
              compact_context: "auto-approve",
            }),
            database_access: "execute_readonly_sql",
          },
        },
        {
          name: "Create dashboards",
          description:
            "Includes database schema and dashboard view structure. Claude Sonnet recommended",
          user_id,
          options: {
            mcp_server_tools: allowProstglesUITools({
              create_dashboards: 1,
              ask_user_questions: 1,
              compact_context: "auto-approve",
              get_specific_tool_schemas: "auto-approve",
              get_tool_list: "auto-approve",
              request_tool_access: 1,
            }),

            database_access: "execute_readonly_sql",
          },
          icon: "ViewCarousel",
          prompt: [
            basePrompt,
            createDashboardsPrompt,
            LLM_PROMPT_VARIABLES.SCHEMA,
            "",
          ].join("\n"),
        },
        {
          name: "Create workflow",
          description:
            "Includes database schema and full tools list. Will suggest database access type, tools and workflow logic required to completed the task. Claude Sonnet recommended",
          user_id,
          options: {
            max_tokens: 18_000,
            mcp_server_tools: allowProstglesUITools({
              create_agentic_workflow: 1,
              ask_user_questions: 1,
              compact_context: "auto-approve",
              get_specific_tool_schemas: "auto-approve",
              get_tool_list: "auto-approve",
              request_tool_access: 1,
              run_typescript_in_nodejs: 1,
            }),
            database_access: "execute_readonly_sql",
          },
          prompt: [
            basePrompt,
            createAgenticWorkflowPrompt,
            LLM_PROMPT_VARIABLES.SCHEMA,
            "",
          ].join("\n"),
        },
        {
          name: "Empty",
          description: "Empty prompt",
          user_id,
          prompt: "",
        },
      ] as const satisfies DBSSchemaForInsert["llm_prompts"][],
      { onConflict: "DoUpdate", returning: { name: 1 } },
    );

    if (
      !getElectronConfig()?.isElectron &&
      process.env.NODE_ENV !== "production"
    ) {
      await dbs.llm_prompts.insert(
        {
          name: "Web app development",
          description:
            "Includes database schema and full tools list. Will suggest database access type, tools and workflow logic required to completed the task. Claude Sonnet recommended",
          user_id,
          options: {
            mcp_server_tools: {
              webdev: {
                list_directory: 1,
                read_files: 1,
                create_component: 1,
                create_component_quick_feedback_preview: 1,
                search_files: 1,
              } satisfies Record<
                keyof (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["webdev"],
                1
              >,
              ...allowProstglesUITools({
                ask_user_questions: 1,
                get_specific_tool_schemas: "auto-approve",
                get_tool_list: "auto-approve",
                compact_context: "auto-approve",
              }),
            },
            database_access: "execute_readonly_sql",
            max_tokens: 18_000,
          },
          prompt: [
            basePrompt,
            "Assist the user in creating a web app for the current database schema.",
            "They expect you to create robust, modern, responsive and intuitive interfaces.",
            "Do not overengineer - keep things simple and functional.",
            "Ask the user for more information if you are not sure.",
            "",
            "",
            "All interactions between the web app and the database are done through prostgles client API which is exposed throught the useProstgles hook:",
            "```typescript",
            `/* useProstgles(): ClientOnReadyParams<DBGeneratedSchema, GeneratedFunctionSchema, { id: string; type: string; }> */`,
            `import { useProstgles } from "@/api/ProstglesProvider";`,
            "```",
            "",
            LLM_PROMPT_VARIABLES.DB_TYPESCRIPT_SCHEMA,
            "",
            LLM_PROMPT_VARIABLES.DB_HANDLER_SCHEMA,
          ].join("\n"),
        } satisfies DBSSchemaForInsert["llm_prompts"],
        { onConflict: "DoUpdate", returning: { name: 1 } },
      );
    }

    // TODO: fix returning type for onconflict do nothing
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (upsertedPrompts?.length) {
      console.warn(
        "Inserted default prompts",
        upsertedPrompts.map((p) => p.name),
      );
    }
  }

  await setupLLMProviders(dbs);
};
