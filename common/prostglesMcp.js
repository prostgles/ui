import { databaseAccessSchema } from "./databaseAccessSchema";
export const mcpServerToolsAllowed = {
    record: {
        partial: true,
        values: {
            record: {
                partial: true,
                values: { enum: [1] },
            },
        },
    },
};
const runSQLSchema = {
    type: {
        sql: {
            type: "string",
            description: "SQL query to execute",
        },
        query_timeout: {
            type: "number",
            optional: true,
            description: "Maximum time in milliseconds the query will be allowed to run. Defaults to 30000.",
        },
        query_params: {
            optional: true,
            description: "Query parameters to use in the SQL query. Must satisfy the query schema.",
            type: "unknown",
        },
    },
};
const filesSchema = {
    description: 'Files to copy into the container. Must include a Dockerfile. Example { "index.ts": "import type { JSONB } from "prostgles-types";" }',
    record: {
        partial: true,
        values: {
            type: "string",
            description: "File content. E.g.: 'import type { JSONB } from \"prostgles-types\";' ",
        },
    },
};
const filterSchema = {
    filter: {
        record: { values: "any" },
        description: "Row filter. Must satisfy the table schema. Example filters: { id: 1 } or { name: 'John' }",
    },
};
const selectSchema = {
    optional: true,
    oneOf: [
        { enum: ["*"] },
        {
            description: "Fields to select. Must satisfy the table schema. Example: { id: 1, name: 1 } or { password: 0 }",
            record: { values: { enum: [1, 0] } },
        },
    ],
};
const outputSchemaArrayOfObjects = {
    arrayOf: {
        record: {
            values: "any",
        },
    },
};
export const PROSTGLES_MCP_SERVERS_AND_TOOLS = {
    "prostgles-db-methods": { [""]: "" },
    "prostgles-db": {
        execute_sql_with_rollback: {
            description: "Executes a SQL query on the connected database in readonly mode (no data can be changed, the transaction is rolled back at the end).",
            schema: runSQLSchema,
            outputSchema: outputSchemaArrayOfObjects,
        },
        execute_sql_with_commit: {
            description: "Executes a SQL query on the connected database in commit mode (data can be changed, the transaction commited at the end).",
            schema: runSQLSchema,
            outputSchema: outputSchemaArrayOfObjects,
        },
        count: {
            description: "Counts rows in a table that satisfy a filter.",
            schema: {
                type: {
                    tableName: {
                        type: "string",
                        description: "Table to select from",
                    },
                    filter: Object.assign(Object.assign({}, filterSchema.filter), { optional: true }),
                },
            },
            outputSchema: "number",
        },
        select: {
            description: "Selects rows from a table.",
            schema: {
                type: {
                    tableName: {
                        type: "string",
                        description: "Table to select from",
                    },
                    filter: Object.assign(Object.assign({}, filterSchema.filter), { optional: true }),
                    select: selectSchema,
                    limit: "integer",
                },
            },
            outputSchema: outputSchemaArrayOfObjects,
        },
        insert: {
            description: "Inserts rows into a table.",
            schema: {
                type: {
                    tableName: {
                        type: "string",
                        description: "Table to insert into",
                    },
                    data: {
                        description: "Data to insert into the table. Must satisfy the table schema.",
                        arrayOf: "any",
                    },
                    returning: selectSchema,
                },
            },
            outputSchema: Object.assign(Object.assign({}, outputSchemaArrayOfObjects), { optional: true }),
        },
        update: {
            description: "Updates rows in a table.",
            schema: {
                type: Object.assign(Object.assign({ tableName: {
                        type: "string",
                        description: "Table to insert into",
                    } }, filterSchema), { data: {
                        description: "Data to insert into the table. Must satisfy the table schema.",
                        record: {
                            values: "any",
                        },
                    }, returning: selectSchema }),
            },
            outputSchema: Object.assign(Object.assign({}, outputSchemaArrayOfObjects), { optional: true }),
        },
        delete: {
            description: "Deletes rows from a table.",
            schema: {
                type: Object.assign(Object.assign({ tableName: {
                        type: "string",
                        description: "Table to delete from",
                    } }, filterSchema), { returning: selectSchema }),
            },
            outputSchema: Object.assign(Object.assign({}, outputSchemaArrayOfObjects), { optional: true }),
        },
    },
    "prostgles-ui": {
        compact_context: {
            description: [
                "Reduce conversation history while preserving important information.",
                "Include important details and information that might be relevant for future conversation. Be concise.",
                "Always use this tool with type='previous-message' after receiving long tool outputs that are not important to keep in full detail in the conversation history.",
            ].join("\n"),
            schema: {
                oneOfType: [
                    {
                        type: { enum: ["conversation"] },
                        summary: {
                            type: "string",
                            description: "Summary of the conversation so far.",
                        },
                    },
                    {
                        type: { enum: ["previous-message"] },
                        summary: {
                            type: "string",
                            description: "Summary of the previous message. .",
                        },
                    },
                ],
            },
            outputSchema: "string",
        },
        run_code_in_sandbox: {
            description: "Creates a docker container. Useful for doing bulk data insert/analysis/processing/ETL. The database permissions must be set to 'Auto approve' to allow the container access to the database. Otherwise, permissions have no effect.",
            schema: {
                type: {
                    // databaseAccess: {
                    //   ...databaseAccessSchema,
                    //   description:
                    //     "Database access configuration for the container. If not provided, the container will not have access to the database. Use the most restrictive access type that is needed to complete the task.",
                    // },
                    files: filesSchema,
                    timeout: {
                        type: "number",
                        optional: true,
                        description: "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ",
                        // default: 30000,
                    },
                    networkMode: {
                        enum: ["none", "bridge", "bridge-internal", "host"],
                        description: "Network mode for the container. Defaults to 'bridge-internal'. Use 'bridge' mode to be able to access the database. Use 'bridge-internal' to access the database but not the internet.",
                        // default: "none",
                        optional: true,
                    },
                    environment: {
                        description: "Environment variables to set in the container",
                        record: { values: "string", partial: true },
                        optional: true,
                    },
                    memory: {
                        type: "string",
                        description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m",
                        optional: true,
                        // default: "512m",
                    },
                    cpus: {
                        type: "string",
                        description: "CPU limit (e.g., '0.5', '1'). Defaults to 1",
                        optional: true,
                        // default: "1",
                    },
                    readOnly: {
                        type: "boolean",
                        description: "Whether to mount the filesystem as read-only. Defaults to true",
                        optional: true,
                        // default: true,
                    },
                },
            },
            outputSchema: {
                type: {
                    state: {
                        enum: ["finished", "error", "build-error", "timed-out", "aborted"],
                    },
                    name: "string",
                    command: "string",
                    log: {
                        arrayOfType: {
                            type: { enum: ["stdout", "stderr", "error"] },
                            text: "string",
                        },
                    },
                    exitCode: "number",
                    runDuration: "number",
                    buildDuration: "number",
                },
            },
        },
        ask_user_questions: {
            mode: "user-provides-response",
            description: [
                "Ask a question to gather information from the user.",
                "Be as short and as consice as possible.",
                "Do not ask more than 8 questions at a time.",
                `Each "choice" type question should have a list of suggested answers to choose from.`,
                `If allowMultipleChoices is true on "choice" type question, the user can select multiple answers.`,
                `When asking "table-columns" type questions, ensure the tableName is valid and include it in the question data. Example question data: { type: "table-columns", question: "Which columns should I select?", tableName: "users" }`,
            ].join("\n"),
            schema: {
                type: {
                    questions: {
                        arrayOf: {
                            oneOfType: [
                                {
                                    type: { enum: ["choice"] },
                                    question: {
                                        type: "string",
                                        description: "The question to ask the user",
                                    },
                                    allowMultipleChoices: {
                                        type: "boolean",
                                        optional: true,
                                        description: "If true, the user can select multiple choices. Defaults to false.",
                                    },
                                    suggestedAnswers: {
                                        description: "The list of suggested answers the user will choose from",
                                        arrayOf: "string",
                                    },
                                },
                                {
                                    type: { enum: ["free-text"] },
                                    question: {
                                        type: "string",
                                        description: "The question to ask the user",
                                    },
                                },
                                {
                                    type: { enum: ["table-name"] },
                                    question: {
                                        type: "string",
                                        description: "The question to ask the user",
                                    },
                                    suggestedTableName: { type: "string", optional: true },
                                },
                                {
                                    type: { enum: ["table-columns"] },
                                    tableName: "string",
                                    question: {
                                        type: "string",
                                        description: "The question to ask the user",
                                    },
                                    suggestedColumns: { type: "string[]", optional: true },
                                },
                            ],
                        },
                    },
                },
            },
            outputSchema: {
                arrayOfType: {
                    question: "string",
                    answers: "string[]",
                },
            },
        },
        get_tool_schemas: {
            description: "Get MCP tool descriptions, input and output schemas in typescript format. Will return all tools by default. Use toolNames to specify which tools to return.",
            schema: {
                type: {
                    mcpServerTools: Object.assign({ descoription: "List of MCP server tools to get. Leave empty to get all tools.", optional: true }, mcpServerToolsAllowed),
                },
            },
            outputSchema: {
                record: {
                    values: {
                        record: {
                            values: "string",
                        },
                    },
                },
            },
        },
        suggest_agentic_workflow: {
            mode: "structured-output",
            description: [
                "Suggest an agent workflow to complete the specified task using MCP tools and database access if needed.",
                "Return workflow_function_definition as valid TypeScript that calls defineAgenticWorkflow(...) directly.",
                "The user will initially execute it in series mode (agent calls and responses will be queued) to ensure it works as expected,",
                "Prefer series-first, human-in-the-loop flow: interleave agent steps and DB operations to enable feedback and safe re-runs.",
                "It is crucial that you allow the database interactions to flow after each agent step to ensure the user can provide feedback and to avoid doing unnecessary work.",
                "Use least-privilege DB/tool scope; for custom DB mode, ensure all dbHandler tables are valid and included in tablePermissions.",
                "Avoid gathering agent responses and then executing database operations at the end of the workflow unless absolutely necessary, as it can lead to a long feedback loop and more work if the workflow needs to be adjusted.",
            ].join("\n"),
            schema: {
                type: {
                    workflow_function_definition: {
                        type: "string",
                        description: "Typescript code defining a function that returns an agent workflow. The function must satisfy the following type provided. The function can use available MCP tools and database access if needed. Available MCP tools and database access are determined by the fetchTools function and the input to this tool.",
                    },
                    workflowId: {
                        type: "integer",
                        optional: true,
                        description: "Workflow ID to update instead of creating a new workflow. If not provided, a new workflow will be created.",
                    },
                },
            },
            outputSchema: {
                oneOfType: [
                    {
                        isValid: { enum: [true] },
                        workflowId: "number",
                    },
                    {
                        isValid: { enum: [false] },
                        logs: "string",
                        error: { type: "unknown", optional: true },
                    },
                ],
            },
        },
        suggest_tools_and_prompt: {
            mode: "structured-output",
            description: "Suggest MCP tools and a system prompt to complete the specified task using MCP tools and database access if needed.",
            schema: {
                type: {
                    suggested_mcp_tool_names: {
                        description: "List of MCP tools that can be used to complete the task",
                        arrayOf: "string",
                    },
                    suggested_database_tool_names: {
                        description: "List of database tools that can be used to complete the task",
                        arrayOf: "string",
                        optional: true,
                    },
                    suggested_prompt: {
                        description: "System prompt that will be used in the LLM chat in conjunction with the selected tools to complete the task. Expand on the task description and include any relevant details and edge cases.",
                        type: "string",
                    },
                    suggested_database_access: Object.assign(Object.assign({}, databaseAccessSchema), { description: "If access to the database is needed, an access type can be specified. Use the most restrictive access type that is needed to complete the task. If new tables are needed, use the 'execute_sql_with_commit' access type." }),
                },
            },
            outputSchema: "string",
        },
        suggest_dashboards: {
            mode: "structured-output",
            description: "Suggest Prostgles UI dashboards to visualize data for the specified task.",
            schema: {
                type: {
                    prostglesWorkspaces: {
                        description: "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type",
                        arrayOf: "any",
                    },
                },
            },
            outputSchema: "string",
        },
    },
    websearch: {
        websearch: {
            description: "Perform a web search and return results",
            schema: {
                type: {
                    q: {
                        type: "string",
                        description: 'The search query. This string is passed to external search services. Supports service-specific syntax (e.g., "site:github.com SearXNG" for Google)',
                    },
                    categories: {
                        type: "string",
                        optional: true,
                        description: " Comma-separated list of active search categories. Categories to search in (e.g., 'general,images,videos')",
                    },
                    engines: {
                        type: "string",
                        optional: true,
                        description: "Comma-separated list of active search engines (e.g., 'google,bing,duckduckgo')",
                    },
                    language: {
                        type: "string",
                        optional: true,
                        description: "Language code for the search results (e.g., 'en' for English, 'fr' for French)",
                    },
                    pageno: {
                        type: "integer",
                        optional: true,
                        description: "Search result page number. Defaults to 1.",
                    },
                    time_range: {
                        enum: ["day", "month", "year"],
                        optional: true,
                        description: "Time range filter for results ('day' = past day, 'month' = past month, 'year' = past year). Only supported by engines that implement time range filtering",
                    },
                },
            },
            outputSchema: {
                arrayOfType: {
                    title: "string",
                    content: "string",
                    url: "string",
                    score: "number",
                    category: "string",
                    engine: "string",
                    img_src: "string",
                    thumbnail: "any",
                },
            },
        },
        get_snapshot: {
            description: "Get a snapshot of a web page",
            schema: {
                type: {
                    url: {
                        type: "string",
                        description: "URL of the web page to snapshot",
                    },
                },
            },
            outputSchema: {
                type: "string",
            },
        },
        get_document_text: {
            description: "Get text contents of a document",
            schema: {
                type: {
                    url: {
                        type: "string",
                    },
                },
            },
            outputSchema: {
                type: "string",
            },
        },
    },
    webdev: {
        list_directory: {
            description: "List files in the web app directory. Will truncate long lists.",
            schema: {
                type: {
                    directoryPath: {
                        type: "string",
                        description: "Directory path to list files from the web app directory. Example: 'src/components'",
                        optional: true,
                    },
                },
            },
            outputSchema: {
                arrayOf: "string",
            },
        },
        read_files: {
            description: "Read files from the web app directory",
            schema: {
                type: {
                    filePaths: {
                        description: "File paths to read from the web app directory.",
                        arrayOf: "string",
                    },
                },
            },
            outputSchema: {
                arrayOfType: {
                    filePath: "string",
                    content: "string",
                },
            },
        },
        search_files: {
            description: "Search files by content and/or file name in the web app directory",
            schema: {
                type: {
                    contentQuery: {
                        type: "string",
                        description: "File content search query. Example: 'useState' to search for files that include 'useState'",
                        optional: true,
                    },
                    fileNameQuery: {
                        type: "string",
                        optional: true,
                        description: "File name search query to further filter search results. Example: 'Counter' to only include files with 'Counter' in the file name.",
                    },
                    extensions: {
                        description: "File extensions to limit the search to (e.g., ['ts', 'tsx', 'js', 'jsx'])",
                        arrayOf: "string",
                        optional: true,
                    },
                },
            },
            outputSchema: {
                arrayOfType: {
                    filePath: "string",
                    matchedContent: "string",
                },
            },
        },
        create_component_quick_feedback_preview: {
            description: [
                "Quickly show the user a component they need you to create so they can provide feedback.",
                "It is crucial that you first show a very basic and simple design and component to get feedback early to ensure you are on the right track and to avoid doing unnecessary work.",
                "The tsx and css files will be both named ComponentQuickFeedbackPreview and saved in the components folder. This means you can import the css file in the tsx file using './ComponentQuickFeedbackPreview.css'",
                "Use best practices for component design and code structure to make it easy for the user to understand and provide feedback.",
            ].join("\n"),
            schema: {
                type: {
                    indexTsx: {
                        type: "string",
                        description: "tsx code for the component. Example: 'import { useState } from \"react\"; ...'",
                    },
                    css: {
                        type: "string",
                        optional: true,
                        description: "css code for the component. Example: '.container { display: flex; }'",
                    },
                    dependencies: {
                        description: "Dependencies to install in the environment (e.g., react, axios)",
                        arrayOf: "string",
                        optional: true,
                    },
                },
            },
            outputSchema: {
                type: "unknown",
            },
        },
        create_component: {
            description: "Create a react component",
            schema: {
                type: {
                    entryPoint: {
                        type: "string",
                        description: "Entry point file for the component. Example: '@/components/Counter/Counter.tsx'",
                    },
                    files: {
                        description: `tsx/css and other files for the component. Example: { "@/components/Counter/Counter.tsx":  "import { useState } from "react"; ..."  } `,
                        record: {
                            values: "string",
                        },
                    },
                    dependencies: {
                        description: "Dependencies to install in the environment (e.g., react, axios)",
                        arrayOf: "string",
                        optional: true,
                    },
                    devDependencies: {
                        description: "Dev Dependencies to install in the environment (e.g., @types/pkg)",
                        arrayOf: "string",
                        optional: true,
                    },
                    test: {
                        description: "Playwright test to run against the component. Example:  'import { test, expect } from \"@playwright/react\"; ...'",
                        type: "string",
                    },
                },
            },
            outputSchema: {
                type: "unknown",
            },
        },
    },
};
const MCP_TOOL_NAME_SEPARATOR = "--";
export const getMCPFullToolName = (server_name, name) => {
    return `${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}`;
};
export const getProstglesMCPFullToolName = (server_name, name) => getMCPFullToolName(server_name, name);
export const getMCPToolNameParts = (fullName) => {
    const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
    if (serverName && toolName) {
        return { serverName, toolName };
    }
};
