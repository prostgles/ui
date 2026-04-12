import { LLM_PROMPT_VARIABLES } from "@common/llmUtils";
import { getProstglesMCPFullToolName } from "@common/mcpUtils";
import { type PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchemaForInsert } from "@common/publishUtils";
import { getElectronConfig } from "@src/electronConfig";
import type { DBS } from "../..";
import { createAgenticWorkflowPrompt } from "./defaultPrompts/createAgenticWorkflow.prompt";
import { setupLLMProviders } from "./setupLLMProviders";

type UiToolName =
  keyof (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"];
const allowProstglesUITools = (
  tools: Partial<Record<UiToolName, 1 | "auto-approve">>,
) => ({
  "prostgles-ui": tools,
});

export const setupLLM = async (dbs: DBS) => {
  /** In case of stale schema update */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (dbs.llm_prompts) {
    const adminUser = await dbs.users.findOne({ passwordless_admin: true });
    const user_id = adminUser?.id;
    const firstLine = [
      `You are an assistant for a software called ${JSON.stringify(LLM_PROMPT_VARIABLES.PROSTGLES_SOFTWARE_NAME)}.`,
      `Your main and the most important goal is to ensure the user achieves their objective with the least amount of effort/input from their side.`.toUpperCase(),
      `It allows managing and exploring data within Postgres databases as well as creating internal tools. \n`,
      `Today is ${LLM_PROMPT_VARIABLES.TODAY}.`,
      `DO NOT USE HARDCODED DATA UNLESS STRICTLY NECESSARY OR THE USER ASKS FOR IT.`,
      `IMPORTANT: NEVER ASSUME THAT THE DATABASE IS EMPTY. ALWAYS USE ${JSON.stringify(getProstglesMCPFullToolName("db", "get_existing_tables_schema"))} TO CHECK THE CURRENT SCHEMA AND ADJUST YOUR ANSWERS ACCORDINGLY.`,
      `Use ${JSON.stringify(getProstglesMCPFullToolName("prostgles-ui", "ask_user_questions"))} to clarify the user intent and/or your strategy with ergonomic, easy to answer "choice" type questions if needed.`,
      `Use ${JSON.stringify(getProstglesMCPFullToolName("prostgles-ui", "compact_context"))} tool extensively to ensure only the most relevant information is kept between your steps. This improves the quality and cost of your work. Prefer to keep the key information as is, without sumarising to ensure minimal information is lost.`,
      `Use ${JSON.stringify(getProstglesMCPFullToolName("prostgles-ui", "create_agent"))} when the task is iterative, requires multiple tool-assisted steps, or is better delegated to a focused sub-agent that does not need database access. Give it the minimum necessary tool access and ask it to return a concise final result.`,

      `When writing typescript code, ensure it compiles and do not include type or eslint errors. Assume strict: true (including noImplicitAny, strictNullChecks).`,
      `Let TS infer obvious local variable types. Avoid i < arr.length - 1 patterns; split into parents + last where needed.`,
      `Prefer to use types instead of interfaces. Prefer for...of over index-based for loops. Only use indexed loops when the numeric index itself is required.`,
    ].join("\n");
    const upsertedPrompts = await dbs.llm_prompts.insertMany(
      [
        {
          name: "Chat",
          description: "Default chat. Includes schema (if allowed)",
          user_id,
          prompt: [
            firstLine,
            "Assist user with any queries they might have. Do not add empty lines in your sql response.",
            "Reply with a full and concise answer that does not require further clarification or revisions.",
            "When asked to add or generate data DO NOT CREATE IT YOURSELF. ",
            "USE PUBLIC SOURCES OR GENERATE IT THORUGH TOOLS. NEVER PROVIDE THE VALUES YOURSELF UNLESS SPECIFICALLY ASKED.",
            "",
            LLM_PROMPT_VARIABLES.SCHEMA,
          ].join("\n"),
          options: {
            mcp_server_tools: allowProstglesUITools({
              ask_user_questions: 1,
              request_tool_access: 1,
              get_tool_schemas: "auto-approve",
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
              get_tool_schemas: "auto-approve",
              get_tool_list: "auto-approve",
              request_tool_access: 1,
            }),

            database_access: "execute_readonly_sql",
          },
          icon: "ViewCarousel",
          prompt: [
            firstLine,
            "Assist user with any queries they might have about creating dashboards.",
            "",
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
              get_tool_schemas: "auto-approve",
              get_tool_list: "auto-approve",
              request_tool_access: 1,
              run_typescript_in_nodejs: 1,
            }),
            database_access: "execute_readonly_sql",
          },
          prompt: [
            firstLine,
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

    if (!getElectronConfig()?.isElectron) {
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
                get_tool_schemas: "auto-approve",
                get_tool_list: "auto-approve",
                compact_context: "auto-approve",
              }),
            },
            database_access: "execute_readonly_sql",
            max_tokens: 18_000,
          },
          prompt: [
            firstLine,
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
