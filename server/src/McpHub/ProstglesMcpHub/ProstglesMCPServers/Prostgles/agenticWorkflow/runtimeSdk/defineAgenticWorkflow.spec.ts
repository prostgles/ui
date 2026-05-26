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
            enum_input: {
              title: "Enum Input",
              type: "enum",
              values: ["option1", "option2", "option3"] as const,
            },
            text_input: {
              title: "Text Input",
              type: "custom",
              dataType: "string",
            },
            date_input: {
              title: "Date Input",
              type: "custom",
              dataType: "Date",
            },
            number_input: {
              title: "Number Input",
              type: "custom",
              dataType: "number",
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
          userInputValues: {
            test_input,
            enum_input,
            text_input,
            date_input,
            number_input,
          },
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

          const result2 = await researcher(test_input.tableName);

          if (enum_input === "option1") {
            //@ts-expect-error
          } else if (enum_input === "option233") {
          }

          text_input.trim();

          date_input.getDate();
          number_input.toFixed(2);
        },
      );
    };
  });
});
