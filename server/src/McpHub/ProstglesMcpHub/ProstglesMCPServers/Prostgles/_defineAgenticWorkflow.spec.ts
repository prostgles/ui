import { strict as assert } from "assert";
import { describe, test } from "node:test";
import { createDockerMCPServerProxy } from "../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import { createAgenticWorkflowContainer } from "./createAgenticWorkflowContainer";
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";

void describe("defineAgenticWorkflow", async () => {
  await test("defineAgenticWorkflow init", () => {
    () => {
      void defineAgenticWorkflow(
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

  await test("parseAgenticWorkflowDefinition", async () => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return new Promise<void>(async (resolve) => {
      const proxy = await createDockerMCPServerProxy(false, {
        agent: (req, res) => {
          assert.equal(req.body.type, "definitions");
          assert.deepStrictEqual(req.body.definitions, workflowDefinitions);
          res.json({ result: "success" });

          proxy.destroy();
          resolve();
        },
      });

      const result = await createAgenticWorkflowContainer(workflowTs);

      assert.equal(result.state, "finished");
      assert.equal(result.exitCode, 0);
    });
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
const workflowTs = `
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
export default defineAgenticWorkflow(
  ${JSON.stringify(workflowDefinitions, null, 2)},
  async ({ researcher }) => {
    const result = await researcher("Prostgles");
    result.summary;
  },
);
`;
