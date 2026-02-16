import type { TableConfig } from "prostgles-server";
import { pickKeys } from "prostgles-types";
import { startAgenticWorkflowSchema } from "./startAgenticWorkflowSchema";

export const tableConfigAgenticWorkflow: TableConfig<{ en: 1 }> = {
  agentic_workflows: {
    columns: {
      id: "INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY",
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      name: "TEXT NOT NULL",
      definition_data: {
        jsonbSchemaType: pickKeys(startAgenticWorkflowSchema, [
          "agentDefinitions",
          "toolDefinitions",
          "databaseAccessDefinitions",
          "userInput",
          "timeOutInSeconds",
        ]),
      },
    },
  },
  agentic_workflow_runs: {
    columns: {
      id: "INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY",
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      workflow_id: `INTEGER NOT NULL REFERENCES agentic_workflows(id) ON DELETE CASCADE`,
      message_id: `INTEGER REFERENCES llm_messages(id) ON DELETE SET NULL`,
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
};
