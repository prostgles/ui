import { databaseAccessSchema } from "./databaseAccessSchema";
import { documentsServiceInputSchema } from "./documentsServiceInputSchema";
import type { DBSSchema } from "./publishUtils";
import { runCodeInSandboxSchema } from "./runCodeInSandboxSchema";
import {
  agentDefinitionsSchema,
  mcpServerToolsAllowed,
} from "./startAgenticWorkflowSchema";
import { tablePermissionsSchema } from "./tablePermissionsSchema";
import { fixIndent } from "./utils";

const runSQLSchema = {
  type: {
    sql: {
      type: "string",
      description: "SQL query to execute",
    },
    query_timeout: {
      type: "number",
      optional: true,
      description:
        "Maximum time in milliseconds the query will be allowed to run. Defaults to 30000.",
    },
    query_params: {
      optional: true,
      description:
        "Query parameters to use in the SQL query. Must satisfy the query schema. Supports index based ($1, $2, etc.) and named parameters (${paramName}).",
      oneOf: ["any[]", { record: { values: "any" } }],
    },
  },
} as const;

const filterSchema = {
  filter: {
    description:
      "Row filter. Must satisfy the table schema. Example filters: { $or: [{ id: 1 }, { name: { $in: ['John'] } }] }",
    record: { values: "any" },
  },
} as const;

const selectSchema = {
  optional: true,
  oneOf: [
    { enum: ["*"] },
    {
      description:
        "Fields to select. Must satisfy the table schema. Example: { id: 1, name: 1 } or { password: 0 }",
      record: { values: { enum: [1, 0] } },
    },
  ],
} as const;

const outputSchemaArrayOfObjects = {
  arrayOf: {
    record: {
      values: "any",
    },
  },
} as const;

const { outputSchema, ...agentSchemaWithoutOutput } =
  agentDefinitionsSchema.record.values.type;

const { files, userInput, userInputValue, ...runTsSchema } =
  runCodeInSandboxSchema.type;

const TYPESCRIPT_CODE_QUALITY =
  "Ensure the typescript code compiles with no errors (assume strict tsconfig and recommended eslint rules). Use top level imports, not require or dynamic imports.";

export const PROSTGLES_MCP_SERVERS_AND_TOOLS = {
  db: {
    execute_readonly_sql: {
      annotations: { readOnlyHint: true },
      description:
        "Executes a SQL query on the connected database in readonly mode (no data can be changed, the transaction is rolled back at the end).",
      schema: runSQLSchema,
      outputSchema: outputSchemaArrayOfObjects,
    },
    execute_sql: {
      annotations: { readOnlyHint: false, destructiveHint: true },
      description:
        "Executes a SQL query on the connected database in commit mode (data can be changed, the transaction committed at the end).",
      schema: runSQLSchema,
      outputSchema: outputSchemaArrayOfObjects,
    },
    count: {
      description: "Counts rows in a table that satisfy a filter.",
      annotations: { readOnlyHint: true },
      schema: {
        type: {
          tableName: "string",
          filter: { ...filterSchema.filter, optional: true },
        },
      },
      outputSchema: "number",
    },
    find: {
      description: "Selects rows from a table.",
      annotations: { readOnlyHint: true },
      schema: {
        type: {
          tableName: "string",
          filter: { optional: true, ...filterSchema.filter },
          select: selectSchema,
          orderBy: {
            optional: true,
            arrayOfType: {
              key: "string",
              asc: { enum: [true, false] },
              nulls: { enum: ["first", "last"], optional: true },
            },
          },
          limit: { optional: true, type: "integer" },
          offset: { optional: true, type: "integer" },
        },
      },
      outputSchema: outputSchemaArrayOfObjects,
    },
    insert: {
      description: "Inserts rows into a table.",
      annotations: { readOnlyHint: false },
      schema: {
        type: {
          tableName: "string",
          data: {
            description:
              "Data to insert into the table. Must satisfy the table schema.",
            oneOf: [
              {
                record: { values: "any" },
              },
              {
                arrayOf: { record: { values: "any" } },
              },
            ],
          },
          onConflict: {
            enum: ["DoNothing", "DoUpdate"],
            optional: true,
            description: fixIndent(`
              By default the insert may fail due to a unique/exclusion constraint violation error. To control this:
              - DoNothing: will ignore the error and do nothing
              - DoUpdate: will update all non conflicting columns of the conflicting row`),
          },
          returning: {
            description:
              "Fields to return for newly inserted data. Nothing will be returned otherwise",
            ...selectSchema,
          },
        },
      },
      outputSchema: {
        optional: true,
        description:
          "Inserted rows returned based on the returning schema. Nothing will be returned if returning is not provided. Return type based on input data: if data is an array of objects, returns an array of objects. If data is a single object, returns a single object.",
        oneOf: [
          {
            record: {
              values: "any",
            },
          },
          outputSchemaArrayOfObjects,
        ],
      },
    },
    update: {
      description: "Updates rows in a table.",
      annotations: { destructiveHint: true, readOnlyHint: false },
      schema: {
        type: {
          tableName: "string",
          ...filterSchema,
          data: {
            description:
              "Data to insert into the table. Must satisfy the table schema.",
            record: {
              values: "any",
            },
          },
          removeDisallowedFields: {
            type: "boolean",
            optional: true,
            description:
              "Whether to remove fields that are not allowed to be updated instead of throwing an error.",
          },
          multi: {
            description:
              "true by default. When set to false the update will throw an error if more than one row is updated (but the update will commit).",
            type: "boolean",
            optional: true,
          },
          returning: {
            description:
              "Fields to return for updated data. Nothing will be returned otherwise",
            ...selectSchema,
          },
        },
      },
      outputSchema: {
        optional: true,
        oneOf: [
          {
            record: {
              values: "any",
            },
          },
          outputSchemaArrayOfObjects,
        ],
      },
    },
    delete: {
      annotations: { destructiveHint: true, readOnlyHint: false },
      description: "Deletes rows from a table.",
      schema: {
        type: {
          tableName: "string",
          ...filterSchema,

          returning: {
            description:
              "Fields to return for the deleted rows. Nothing will be returned otherwise",
            ...selectSchema,
          },
        },
      },
      outputSchema: {
        oneOf: [outputSchemaArrayOfObjects, { enum: [undefined] }],
      },
    },
  },
  "prostgles-ui": {
    compact_context: {
      mode: undefined,
      description: [
        "Reduces the conversation history sent to the LLM while preserving important context.",
        "IMPORTANT: Must keep irrelevant tool result/output to a minimum to improve response quality and reduce chat cost. ",
        "Retain details that may matter later, but keep the summary concise.",
        "Always use this tool with type='previous-message' after receiving long tool outputs that are not important to keep in full detail in the conversation history.",
      ].join("\n"),
      schema: {
        type: {
          type: { enum: ["conversation", "previous-message"] },
          summary: {
            type: "string",
            description:
              "When type=conversation it is a summary of the conversation so far. When type=previous-message it is a summary of the previous message.",
          },
        },
      },
      outputSchema: "string",
    },
    run_code_in_sandbox: {
      annotations: {
        openWorldHint: true,
      },
      mode: undefined,
      description: fixIndent(`
        Executes code in a docker container.
        User will see realtime logs and the final output of the container execution. 
        User can also choose to re-run the container with different user input (if provided).
        Use descriptive log messages to make it easier for the user to understand progress, what is happening and provide feedback.
        Use this tool to execute code in any language, with any dependencies, and with access to the database if needed. 
        To access the database must use POST requests to the exposed api endpoint. Cannot use direct DB sockets or drivers. 
        Useful for doing bulk data insert/analysis/processing/ETL. 
        The database permissions must be set to 'Auto approve' to allow the container access to the database. 
        Otherwise, permissions have no effect.
        
        Example input payload:
        
        {
          "files": {
            "Dockerfile": "FROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"node\", \"index.js\"]",
            "index.ts": "import type { JSONB } from \"prostgles-types\"; console.log('hello world');"
          }
        }
        `),
      schema: runCodeInSandboxSchema,
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
    run_typescript_in_nodejs: {
      annotations: {
        openWorldHint: true,
      },
      mode: undefined,
      description: fixIndent(`
        Executes TypeScript code in a Docker container.
        It gets compiled as CommonJS which means top level await is not allowed and must be executed inside an async function.
        User will see realtime logs and the final output.
        User can also choose to re-run the container with different user input (if provided).
        Use descriptive log messages to make it easier for the user to understand progress, what is happening and provide feedback.
        ${TYPESCRIPT_CODE_QUALITY}
        Prefer to use nodejs existing modules and can also specify custom dependencies to be installed as long as they are reputable.
        Can specify access to the database if needed. 
        To access the database must use POST requests to the exposed api endpoint. Cannot use direct DB sockets or drivers. 
        Useful for doing bulk data insert/analysis/processing/ETL. 
        Otherwise, permissions have no effect.
        
        Example input payload:
        
        {
          "indexTs": "import type { JSONB } from \"prostgles-types\"; console.log('hello world');",
          "packageDependencies": {
            "prostgles-types": "^4.0.217",
          }
        }
        `),
      schema: {
        type: {
          entrypointTs: {
            type: "string",
            description:
              "Typescript code to execute. Must compile with no errors assuming strict tsconfig and recommended eslint rules.",
          },
          packageDependencies: {
            optional: true,
            description:
              'Dependencies to install in the container. Must be reputable npm packages. Example: { "prostgles-types": "^4.0.217" }',
            record: {
              values: "string",
            },
          },
          ...runTsSchema,
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
        "DO NOT SEND OTHER TOOL USE REQUESTS TOGETHER WITH THIS TOOL. It must be a single tool use request",
        "Be as short and as concise as possible.",
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
                    description:
                      "If true, the user can select multiple choices. Defaults to false.",
                  },
                  suggestedAnswers: {
                    description:
                      "The list of suggested answers the user will choose from",
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
      mode: undefined,
      description: fixIndent(`
          Get MCP tool descriptions, input and output schemas in typescript format. 
          Will return all tools by default. 
          Use toolNames to specify which tools to return.
          infoLevel controls how much information to return about the tools:
          - full: returns detailed descriptions and schemas for the tools to allow for better understanding of how to use them.
          - basic (default): returns only the tool descriptions.
        `),
      schema: {
        type: {
          mcpServerTools: {
            description: fixIndent(`
                Which MCP server tools to get in this format: { [serverName]: { [toolName1]: 1, [toolName2]: 1 } } which means toolName1 and toolName2 from serverName. 
                Leave empty to get all tools. Example: { fetch: { fetch: 1 } }`),
            optional: true,
            ...mcpServerToolsAllowed,
          },
          infoLevel: {
            optional: true,
            enum: ["full", "basic"],
          },
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
    request_tool_access: {
      mode: "auto-approved-user-actionable",
      description:
        "Request access to mcp tools. The user will be prompted to approve or deny access. Use this tool when you need access to a tool that you don't have access to yet. The user will then approve access if they are comfortable with it based on the tool description and the context of the conversation.",
      schema: {
        type: {
          reason: {
            description: "Reason for requesting access to the tool",
            type: "string",
            optional: true,
          },
          mcpServerTools: {
            description:
              "List of MCP server tools to enable for this chat. Example: { fetch: { fetch: 1 } }",
            optional: true,
            ...mcpServerToolsAllowed,
          },
          // databaseAccess: databaseAccessSchema,
          databaseAccess: {
            optional: true,
            oneOf: [
              { enum: ["execute_readonly_sql", "execute_sql"] },
              tablePermissionsSchema,
            ],
          },
        },
      },
      outputSchema: {
        type: {
          validatedTools: {
            arrayOfType: {
              id: "number",
              server_name: "string",
            },
          },
          status: { optional: true, enum: ["approved", "denied"] },
        },
      },
    },
    create_agent: {
      mode: undefined, //"auto-approved-user-actionable",
      description: [
        "Creates and runs an agent to iteratively complete the specified task using MCP tools if needed.",
        "The agent works in its own chat, can take multiple tool-assisted steps up to its configured iteration limit, and returns a final result.",
        "Use least-privilege tool scope.",
      ].join("\n"),
      schema: {
        type: {
          name: "string",
          autoApproveAllTools: "boolean",
          timeout: "integer",
          ...agentSchemaWithoutOutput,
          tools: {
            description:
              "List of MCP server tools available to the agent. Example: { fetch: { fetch: 1 } }",
            optional: true,
            ...mcpServerToolsAllowed,
          },
        },
      },
      outputSchema: {
        oneOfType: [
          {
            success: { enum: [true] },
            result: "string",
          },
          {
            success: { enum: [false] },
            error: "string",
          },
        ],
      },
    },
    create_agentic_workflow: {
      mode: "auto-approved-user-actionable",
      description: [
        "Suggest an agent workflow to complete the specified task using MCP tools and database access if needed.",
        "Return workflow_function_definition as valid TypeScript that calls defineAgenticWorkflow(...) directly.",
        TYPESCRIPT_CODE_QUALITY,
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
            description:
              "Typescript code defining a function that returns an agent workflow. The function must satisfy the following type provided. The function can use available MCP tools and database access if needed. Available MCP tools and database access are determined by the fetchTools function and the input to this tool.",
          },
          workflow_function_definition_summary: {
            type: "string",
            description:
              "A concise summary of the workflow function definition for the user to understand what the workflow does without having to read the code. This will be shown to the user when asking for approval to run the workflow.",
          },
          package_dependencies: {
            optional: true,
            description:
              "A list of npm packages to be added to the container package.json dependencies.",
            record: {
              values: "string",
            },
          },
          workflowId: {
            type: "integer",
            optional: true,
            description:
              "FOR INTERNAL USE ONLY. DO NOT ASK USER ABOUT THIS. Workflow ID to update instead of creating a new workflow. If not provided, a new workflow will be created.",
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
    create_dashboards: {
      mode: "auto-approved-user-actionable",
      description:
        "Suggest Prostgles UI dashboards to visualize data for the specified task.",
      schema: {
        type: {
          prostglesWorkspaces: {
            description:
              "Workspace to create. Must satisfy the typescript WorkspaceInsertModel type",
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
            description:
              'The search query. This string is passed to external search services. Supports service-specific syntax (e.g., "site:github.com SearXNG" for Google)',
          },
          categories: {
            type: "string",
            optional: true,
            description:
              " Comma-separated list of active search categories. Categories to search in (e.g., 'general,images,videos')",
          },
          engines: {
            type: "string",
            optional: true,
            description:
              "Comma-separated list of active search engines (e.g., 'google,bing,duckduckgo')",
          },
          language: {
            type: "string",
            optional: true,
            description:
              "Language code for the search results (e.g., 'en' for English, 'fr' for French)",
          },
          pageno: {
            type: "integer",
            optional: true,
            description: "Search result page number. Defaults to 1.",
          },
          time_range: {
            enum: ["day", "month", "year"],
            optional: true,
            description:
              "Time range filter for results ('day' = past day, 'month' = past month, 'year' = past year). Only supported by engines that implement time range filtering",
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
          template: { optional: true, type: "any" },
          publishedDate: { optional: true, type: "any" },
          parsed_url: { optional: true, type: "any" },
          priority: { optional: true, type: "any" },
          engines: { optional: true, type: "any" },
          positions: { optional: true, type: "any" },
          pubdate: { optional: true, type: "any" },
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
          ...documentsServiceInputSchema.type,
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
      description:
        "List files in the web app directory. Will truncate long lists.",
      schema: {
        type: {
          directoryPath: {
            type: "string",
            description:
              "Directory path to list files from the web app directory. Example: 'src/components'",
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
      description:
        "Search files by content and/or file name in the web app directory",
      schema: {
        type: {
          contentQuery: {
            type: "string",
            description:
              "File content search query. Example: 'useState' to search for files that include 'useState'",
            optional: true,
          },
          fileNameQuery: {
            type: "string",
            optional: true,
            description:
              "File name search query to further filter search results. Example: 'Counter' to only include files with 'Counter' in the file name.",
          },
          extensions: {
            description:
              "File extensions to limit the search to (e.g., ['ts', 'tsx', 'js', 'jsx'])",
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
            description:
              "tsx code for the component. Example: 'import { useState } from \"react\"; ...'",
          },
          css: {
            type: "string",
            optional: true,
            description:
              "css code for the component. Example: '.container { display: flex; }'",
          },
          dependencies: {
            description:
              "Dependencies to install in the environment (e.g., react, axios)",
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
            description:
              "Entry point file for the component. Example: '@/components/Counter/Counter.tsx'",
          },
          files: {
            description: `tsx/css and other files for the component. Example: { "@/components/Counter/Counter.tsx":  "import { useState } from "react"; ..."  } `,
            record: {
              values: "string",
            },
          },
          dependencies: {
            description:
              "Dependencies to install in the environment (e.g., react, axios)",
            arrayOf: "string",
            optional: true,
          },
          devDependencies: {
            description:
              "Dev Dependencies to install in the environment (e.g., @types/pkg)",
            arrayOf: "string",
            optional: true,
          },
          test: {
            description:
              "Playwright test to run against the component. Example:  'import { test, expect } from \"@playwright/react\"; ...'",
            type: "string",
          },
        },
      },
      outputSchema: {
        type: "unknown",
      },
    },
  },
} as const satisfies Record<
  string,
  Record<
    string,
    | string
    | {
        description: string;
        /**
         * Must be an object
         */
        schema: { type: any };
        outputSchema?: any;
        mode?: DBSSchema["mcp_server_tools"]["mode"];
        annotations?: DBSSchema["mcp_server_tools"]["annotations"];
      }
  >
>;

export type ProstglesDbTools = (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["db"];
type ProstglesMcpTools = typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;
export type ProstglesMcpTool = {
  [K in keyof ProstglesMcpTools]: {
    type: K;
    tool_name: keyof ProstglesMcpTools[K];
  };
}[keyof ProstglesMcpTools];

const MCP_TOOL_NAME_SEPARATOR = "--";
export const getMCPFullToolName = <
  Name extends string,
  ServerName extends string,
>(
  server_name: ServerName,
  name: Name,
): `${ServerName}${typeof MCP_TOOL_NAME_SEPARATOR}${Name}` => {
  return `${server_name}${MCP_TOOL_NAME_SEPARATOR}${name}` as const;
};

export const getProstglesMCPFullToolName = <
  ServerName extends keyof ProstglesMcpTools,
  Name extends keyof ProstglesMcpTools[ServerName] & string,
>(
  server_name: ServerName,
  name: Name,
) => getMCPFullToolName(server_name, name);

export const getMCPToolNameParts = (fullName: string) => {
  const [serverName, toolName] = fullName.split(MCP_TOOL_NAME_SEPARATOR);
  if (serverName && toolName) {
    return { serverName, toolName };
  }
};

export type AllowedChatTool = Pick<
  DBSSchema["mcp_server_tools"],
  "server_name" | "mode" | "description"
> & {
  tool_id: number;
  name: string;
  tool_name: string;
  input_schema: any;
  auto_approve: boolean;
};
