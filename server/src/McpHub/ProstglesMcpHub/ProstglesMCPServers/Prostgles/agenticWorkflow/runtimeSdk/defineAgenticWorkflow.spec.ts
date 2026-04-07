import { describe, test } from "node:test";
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";

void describe("defineAgenticWorkflow", async () => {
  await test("defineAgenticWorkflow type tests", () => {
    () => {
      void defineAgenticWorkflow(
        {
          name: "Test Workflow",
          containerConfiguration: { timeout: 60_000 },
          databaseAccessDefinitions: {
            mode: "custom",
            tablePermissions: {
              tbl1: {
                select: true,
                insert: true,
              },
            },
          },
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
            web: {
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
        async ({
          agentHandlers: {
            researcher,
            //@ts-expect-error
            invalid,
          },
          tableHandlers,
          runSQL,
          orchestratorToolHandlers,
          userInputValues: { test_input },
        }) => {
          void tableHandlers.tbl1?.insert({ col1: "value1", col2: 123 });
          // @ts-expect-error
          void runSQL("SELECT * FROM tbl1");
          const result = await researcher("Prostgles");
          result.summary satisfies string;

          void orchestratorToolHandlers.web.search({ q: "Prostgles" });
          void orchestratorToolHandlers.web.get_snapshot({
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
