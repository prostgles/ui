import { fromEntries, getEntries } from "@common/utils";
import { createContainerSchema } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/schemas/getCreateContainerToolSchema";
import type { TableConfig } from "prostgles-server";
import { omitKeys, pickKeys } from "prostgles-types";
import { startAgenticWorkflowSchema } from "../../../common/startAgenticWorkflowSchema";

export const tableConfigAgenticWorkflow: TableConfig<{ en: 1 }> = {
  agentic_workflows: {
    columns: {
      id: "INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY",
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      connection_id: `UUID REFERENCES connections(id) ON DELETE CASCADE`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      message_id: `int8 NOT NULL REFERENCES llm_messages(id) ON DELETE SET NULL`,
      tool_use_id: `TEXT NOT NULL `,
      name: "TEXT NOT NULL",
      saved: "BOOLEAN NOT NULL DEFAULT FALSE",
      definition: "TEXT NOT NULL",
      definition_summary: `TEXT NOT NULL DEFAULT ''`,

      package_dependencies: {
        nullable: true,
        jsonbSchema: {
          description:
            "A list of npm packages to be added to the container package.json dependencies.",
          record: {
            values: "string",
          },
        },
      },
      definition_data: {
        jsonbSchemaType: pickKeys(startAgenticWorkflowSchema, [
          "containerConfiguration",
          "agentDefinitions",
          "databaseAccessDefinitions",
          "userInput",
          "newTables",
          "orchestrationTools",
        ]),
      },
      definition_override: {
        nullable: true,
        jsonbSchemaType: {
          agentDefinitions: {
            optional: true,
            record: {
              partial: true,
              values: {
                type: {
                  ...omitKeys(
                    startAgenticWorkflowSchema.agentDefinitions.record.values
                      .type,
                    ["outputSchema"],
                  ),
                  prompt: { type: "string", optional: true },
                  modelName: { type: "string", optional: true },
                  maxCostUSD: { type: "number", optional: true },
                  maxIterations: { type: "number", optional: true },
                },
              },
            },
          },
          containerConfiguration: {
            optional: true,
            type: fromEntries(
              getEntries(
                startAgenticWorkflowSchema.containerConfiguration.type,
              ).map(([key, value]) => {
                return [key, { ...value, optional: true }] as const;
              }),
            ),
          },
        },
      },
      created: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    },
  },
  agentic_workflow_runs: {
    columns: {
      id: "INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY",
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      workflow_id: `INTEGER NOT NULL REFERENCES agentic_workflows(id) ON DELETE CASCADE`,
      message_id: `int8 REFERENCES llm_messages(id) ON DELETE SET NULL`,
      user_input_value: {
        jsonbSchema: {
          record: {
            values: "unknown",
          },
        },
      },
      execution_mode: {
        enum: ["series", "parallel"],
        defaultValue: "series",
      },
      created: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
      finished: `TIMESTAMPTZ`,
      state: {
        jsonbSchema: {
          oneOfType: [
            {
              status: {
                enum: ["running", "completed", "error", "stopped"],
              },
              progressPercent: { type: "number", optional: true },
              message: { type: "string", optional: true },
            },
          ],
        },
      },
      log: {
        jsonbSchema: {
          arrayOfType: {
            type: { enum: ["stdout", "stderr", "error"] },
            text: "string",
          },
        },
      },
    },
  },
  docker_containers: {
    columns: {
      id: "INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY",
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      tool_use_id: `TEXT NOT NULL`,
      name: "TEXT NOT NULL DEFAULT ''",
      saved: "BOOLEAN NOT NULL DEFAULT FALSE",
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      user_input_value: {
        jsonbSchema: {
          record: {
            values: "unknown",
          },
        },
      },
      created: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
      finished: `TIMESTAMPTZ`,
      configuration: { jsonbSchema: createContainerSchema },
      state: {
        jsonbSchema: {
          oneOfType: [
            {
              status: {
                enum: ["running", "completed", "error", "stopped"],
              },
              progressPercent: { type: "number", optional: true },
              message: { type: "string", optional: true },
            },
          ],
        },
      },
      log: {
        jsonbSchema: {
          arrayOfType: {
            type: { enum: ["stdout", "stderr", "error"] },
            text: "string",
          },
        },
      },
    },
    indexes: {
      uniqueToolUseId: { unique: true, columns: "id, tool_use_id" },
    },
  },
};
