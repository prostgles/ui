import { describe, test } from "node:test";
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";

void describe("defineAgenticWorkflow", async () => {
  await test("defineAgenticWorkflow init", () => {
    () => {
      void defineAgenticWorkflow(
        {
          name: "Test Workflow",
          timeOutInSeconds: 60,
          agentDefinitions: {
            researcher: {
              prompt: "You are a research assistant.",
              tools: { fetch: { fetch_webpage: 1 } },
              outputSchema: {
                summary: { type: "string" },
                references: { type: "string[]" },
              },
            },
          },
          orchestrationTools: {
            websearch: {
              search: 1,
              get_snapshot: 1,
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

          void toolHandlers.websearch.search({ q: "Prostgles" });
          void toolHandlers.websearch.get_snapshot({
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
