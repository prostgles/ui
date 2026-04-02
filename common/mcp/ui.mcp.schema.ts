import type { dbMcpSchema } from "./db.mcp.schema";
import { getMCPFullToolName } from "../mcpUtils";
import { runCodeInSandboxSchema } from "./runCodeInSandboxSchema";
import {
  agentDefinitionsSchema,
  mcpServerToolsAllowed,
} from "./startAgenticWorkflowSchema";
import { tablePermissionsSchema } from "./tablePermissionsSchema";
import { fixIndent } from "../utils";

const { outputSchema, ...agentSchemaWithoutOutput } =
  agentDefinitionsSchema.record.values.type;

const { files, userInput, userInputValue, ...runTsSchema } =
  runCodeInSandboxSchema.type;

const TYPESCRIPT_CODE_QUALITY =
  "Ensure the typescript code compiles with no errors (assume strict tsconfig and recommended eslint rules). Use top level imports, not require or dynamic imports.";

export const uiMcpSchema = {
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
      "Do not ask more than 4 questions at a time.",
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
            { enum: ["execute_readonly_sql"] },
            { enum: ["execute_sql"] },
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
      "Any external dependencies must be listed in the package_dependencies field to ensure they get installed.",
      "External dependencies should be reputable and kept to a minimum to reduce security risks. Always prefer using existing modules and tools instead of adding new dependencies, but if necessary, only add well-known and widely used packages.",
      "Do not use external dependencies if there are more robust MCP tools available",
      "The user will initially execute it in series mode (agent calls and responses will be queued) to ensure it works as expected,",
      "Prefer series-first, human-in-the-loop flow: interleave agent steps and DB operations to enable feedback and safe re-runs.",
      "It is crucial that you allow the database interactions to flow after each agent step to ensure the user can provide feedback and to avoid doing unnecessary work.",
      "Use least-privilege DB/tool scope; for custom DB mode, ensure all dbHandler tables are valid and included in tablePermissions.",
      `DO NOT INCLUDE CREATE STATEMENTS FOR TABLES THAT ALREADY EXIST IN THE DATABASE. ` +
        `Any change to the existing table schema must be done through the ${getMCPFullToolName("db", "execute_sql" satisfies keyof typeof dbMcpSchema)} before confirming it with the user.`,
      `Inspect the existing table schemas and ensure the workflow function definition is compatible with them. If new tables are needed, confirm with the user first.`,
      "Prefer to use folder/file access from userInput rather than mcp orchestrator tools. This mounts the files to the container to allow interacting with native nodejs fs module for file operations instead of using MCP tools that allow filesystem access unless requested by the user.",
      "When interacting with the DB avoid using repeated insert() calls where insertMany(arr) is possible.",
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
} as const;
