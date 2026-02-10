import { describe, test } from "node:test";
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";

void describe("defineAgenticWorkflow", async () => {
  await test("defineAgenticWorkflow init", () => {
    () => {
      void defineAgenticWorkflow(
        {
          name: "Test Workflow",
          timeOutInSeconds: 60,
          toolDefinitions: {
            fetch_webpage: {
              mcpServerName: "fetch",
              toolNames: ["fetch"],
            },
            query_database: {
              mcpServerName: "database",
              toolNames: ["select"],
            },
          },
          agentDefinitions: {
            researcher: {
              prompt: "You are a research assistant.",
              outputSchema: {
                summary: "string",
                references: "string[]",
              },
            },
          },
        },
        async ({
          researcher,
          //@ts-expect-error
          invalid,
        }) => {
          const result = await researcher("Prostgles");
          result.summary satisfies string;

          // @ts-expect-error
          result.invalid;
        },
      );
    };
  });
});

const workflowDefinitions = {
  name: "Test Workflow",
  toolDefinitions: {
    fetch_webpage: {
      mcpServerName: "fetch",
      toolNames: ["fetch"],
    },
    query_database: {
      mcpServerName: "database",
      toolNames: ["select"],
    },
  },
  agentDefinitions: {
    researcher: {
      prompt: "You are a research assistant.",
      outputSchema: {
        summary: "string",
        references: "string[]",
      },
    },
  },
};
