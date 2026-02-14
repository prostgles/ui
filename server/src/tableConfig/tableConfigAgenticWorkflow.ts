import type { TableConfig } from "prostgles-server";
import { pickKeys } from "prostgles-types";
import {
  agentOutputSchemaType,
  startAgenticWorkflowSchema,
} from "./startAgenticWorkflowSchema";

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
      user_input_value: {
        jsonbSchema: agentOutputSchemaType,
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
