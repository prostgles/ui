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
          workflowAllowedTools: {
            fetch: { fetch: 1, getSnapshot: 1 },
          },
          agentDefinitions: {
            researcher: {
              prompt: "You are a research assistant.",
              outputSchema: {
                summary: { type: "string" },
                references: { type: "string[]" },
              },
            },
          },
          userInput: {
            test_input: {
              title: "Test Input",
              type: "table-filter",
              tableName: "users",
            },
          },
        },
        async (
          {
            researcher,
            //@ts-expect-error
            invalid,
          },
          dbHandler,
          toolHandlers,
          { test_input },
        ) => {
          const result = await researcher("Prostgles");
          result.summary satisfies string;

          void toolHandlers.fetch.fetch();
          void toolHandlers.fetch.getSnapshot({
            url: "https://www.example.com",
          });

          // @ts-expect-error
          result.invalid;

          const result2 = await researcher(test_input?.tableName);
        },
      );
    };
  });
});
