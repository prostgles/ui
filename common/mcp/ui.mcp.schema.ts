import { getMCPFullToolName } from "../mcpUtils";
import { fixIndent } from "../utils";
import { databaseAccessSchema } from "./databaseAccessSchema";
import { runCodeInSandboxSchema } from "./runCodeInSandboxSchema";
import {
  agentDefinitionsSchema,
  mcpServerToolsAllowed,
} from "./startAgenticWorkflowSchema";
import { tableOptionsJsonbSchema } from "./tableOptionsJsonbSchema";
import { tablePermissionsSchema } from "./tablePermissionsSchema";

const { outputSchema, ...agentSchemaWithoutOutput } =
  agentDefinitionsSchema.record.values.type;

const { files, userInput, userInputValue, ...runTsSchema } =
  runCodeInSandboxSchema.type;

export const TYPESCRIPT_CODE_QUALITY =
  "Ensure the typescript code compiles with no errors (assume strict tsconfig and recommended eslint rules). Use top level imports, not require or dynamic imports.";

export const uiMcpSchema = {
  compact_context: {
    icon: "ArrowCollapse",
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
    icon: "Docker",
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
        
        ${"```json"}
        {
          "files": {
            "Dockerfile": "FROM node:18\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"node\", \"index.js\"]",
            "index.ts": "import type { JSONB } from \"prostgles-types\"; console.log('hello world');"
          }
        }
        ${"```"}
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
    icon: "Nodejs",
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
        ${"```json"}
        {
          "indexTs": "import type { JSONB } from \"prostgles-types\"; console.log('hello world');",
          "packageDependencies": {
            "prostgles-types": "^4.0.217",
          }
        }
        ${"```"}
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
    icon: "AccountQuestionOutline",
    mode: "user-provides-response",
    description: [
      "Ask a question to gather information from the user. ",
      "This is meant to be used when the information cannot be easily obtained from the schema or tools available and is necessary to remove ambiguity from user intent.",
      `Refrain from asking "free-text" unless absolutely necessary. Always try to use more ergonomic types ("choice", "table-name", "table-columns" etc.) type questions when possible to reduce user input errors and eliminate the effort of manually typing long responses.`,
      "Always try to infer missing information from the schema and tools before asking the user.",
      "DO NOT SEND OTHER TOOL USE REQUESTS TOGETHER WITH THIS TOOL. It must be a single tool use request",
      "Be as short and as concise as possible.",
      "Do not ask more than 4 questions at a time.",
      `Each "choice" type question should have a list of suggested answers to choose from.`,
      `If allowMultipleChoices is true on "choice" type question, the user can select multiple answers.`,
      `Refrain from asking user questions if the information can be easily obtained from the schema or tools available.`,
      `Refrain from asking questions that will be answered later on through userInput.`,
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
  get_tool_list: {
    icon: "Tools",
    mode: undefined,
    description: fixIndent(`
      Get the list of installed MCP server and tool names. To get detailed information about the tools use ${getMCPFullToolName("prostgles-ui", "get_specific_tool_schemas")}.
   `),
    schema: {
      type: {},
    },
    outputSchema: {
      arrayOfType: {
        server_name: "string",
        tool_name: "string",
      },
    },
  },
  get_specific_tool_schemas: {
    icon: "Tools",
    mode: undefined,
    description: fixIndent(`
      Get MCP tool descriptions, input and output schemas in typescript format.
      Use mcpServerTools from ${"get_tool_list"} to specify which mcp servers/tools to return.
      "infoLevel" (optional) controls how much information to return about the tools:
      - full: returns detailed descriptions and schemas for the tools to allow for better understanding of how to use them.
      - basic (default): returns only the tool descriptions.
      "mcpServerTools" IS REQUIRED to specify which tools to get information about. Example: { web: { fetch: 1 } }
    `),
    schema: {
      type: {
        mcpServerTools: {
          description: fixIndent(`
                Which MCP server tools to get in this format: { [serverName]: { [toolName1]: 1, [toolName2]: 1 } } which means toolName1 and toolName2 from serverName. 
                Example: { web: { fetch: 1 } }`),
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
            values: {
              type: {
                description: "string",
                tsDefinition: "string",
                inputSchema: { record: { values: "unknown" } },
                outputSchema: { nullable: true, record: { values: "unknown" } },
              },
            },
          },
        },
      },
    },
  },
  request_tool_access: {
    icon: "LockQuestion",
    mode: "auto-approved-user-actionable",
    description: fixIndent(
      `Request access to mcp tools/database. 
      USE THE STRICTEST LEAST-PRIVILEGE ACCESS POSSIBLE when requesting database access.
      Prefer to use mode=custom for database access and specify the exact tables and permissions needed instead of using mode=execute_sql or execute_readonly_sql which provide much broader access.
      The user will be prompted to approve or deny access. 
      Use this tool when you need access to a tool that you don't have access to yet. 
      The user will then approve access if they are comfortable with it based on the tool description and the context of the conversation.`,
    ),
    schema: {
      type: {
        reason: {
          description: "Reason for requesting access to the tool",
          type: "string",
          optional: true,
        },
        mcpServerTools: {
          description:
            "List of MCP server tools to enable for this chat. Example: { web: { fetch: 1 } }",
          optional: true,
          ...mcpServerToolsAllowed,
        },
        databaseAccess: databaseAccessSchema,
        // databaseAccess: {
        //   optional: true,
        //   oneOf: [
        //     { enum: ["execute_readonly_sql"] },
        //     { enum: ["execute_sql"] },
        //     tablePermissionsSchema,
        //   ],
        // },
      },
    },
    outputSchema: {
      type: {
        validatedTools: {
          arrayOfType: {
            id: "number",
            server_name: "string",
            config_id: { oneOf: ["number", { enum: [null] }] },
          },
        },
        status: { optional: true, enum: ["approved", "denied"] },
      },
    },
  },
  create_agent: {
    icon: "RobotOutline",
    mode: "always-needs-approval" /** To prevent privilege escalation */,
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
            "List of MCP server tools available to the agent. Example: { web: { fetch: 1 } }",
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
    icon: "CubeOutline",
    mode: "auto-approved-user-actionable",
    description:
      "Creates an agentic workflow which is executed manually by the user to iteratively complete the specified task using MCP tools and database access if needed. Runtime logs are only visible to the user. Definition validation is not a substitute for testing external runtime assumptions",
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
          //TODO: add: " For best practice, you can link key parts of the summary to the relevant parts of the code using markdown links with line numbers. Example: 'This workflow does X, Y and Z. The function starts by doing [A](#L10), then it does [B](#L20) and finally it does [C](#L30).'",
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
  get_tables_metadata: {
    icon: "Table",
    mode: undefined,
    description: "Get rendering metadata for database tables.",
    schema: {
      type: {
        tableNames: "string[]",
      },
    },
    outputSchema: {
      type: "unknown",
    },
  },
  set_tables_metadata: {
    icon: "Table",
    mode: undefined,
    description: "Set rendering metadata for database tables",
    schema: { type: { metadata: tableOptionsJsonbSchema } },
    outputSchema: {
      type: "unknown",
    },
  },
  find_icons: {
    icon: "ImageSearch",
    mode: undefined,
    description:
      "Search for icons by name. Returns a list of icon names that match the search query.",
    schema: {
      type: {
        query: "string",
      },
    },
    outputSchema: {
      type: "string[]",
    },
  },
  create_dashboards: {
    icon: "ViewCarousel",
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
} as const;
