import { strict } from "assert";
import { test, describe } from "node:test";
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
import { parseAgenticWorkflowDefinition } from "./parseAgenticWorkflowDefinition";

void describe("defineAgenticWorkflow", async () => {
  await test("defineAgenticWorkflow init", () => {
    const workflow = defineAgenticWorkflow(
      {
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
      },
      async ({ researcher }) => {
        const result = await researcher("Prostgles");
        result.summary;
      },
    );
    strict.equal(typeof workflow, "function");
  });

  await test("parseAgenticWorkflowDefinition", () => {
    // const parsed = parseAgenticWorkflowDefinition(`
    //   export default defineAgenticWorkflow(
    //   {
    //     name: "Test Workflow",
    //     toolDefinitions: {
    //       fetch_webpage: {
    //         mcpServerName: "fetch",
    //         toolNames: ["fetch"],
    //       },
    //       query_database: {
    //         mcpServerName: "database",
    //         toolNames: ["select"],
    //       },
    //     },
    //     agentDefinitions: {
    //       researcher: {
    //         prompt: "You are a research assistant.",
    //         outputSchema: {
    //           summary: "string",
    //           references: "string[]",
    //         },
    //       },
    //     },
    //   },
    //   async ({ researcher }) => {
    //     const result = await researcher("Prostgles");
    //     result.summary;
    //   },
    // );
    //   `);
    // strict.equal(parsed, "dwada");
    // strict.equal(parsed.ok, true);
  });
});
