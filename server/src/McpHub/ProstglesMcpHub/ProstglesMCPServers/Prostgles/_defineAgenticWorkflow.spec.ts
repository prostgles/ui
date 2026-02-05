import { strict as assert } from "assert";
import { test, describe } from "node:test";
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
import { readFileSync } from "fs";
import { join } from "path";
import { createContainer } from "../DockerSandbox/createContainer";
import http from "http";
import { createDockerMCPServerProxy } from "../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";

void describe("defineAgenticWorkflow", async () => {
  await test("defineAgenticWorkflow init", () => {
    () => {
      defineAgenticWorkflow(
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
    const parseAgenticWorkflowDefinitionTs = readFileSync(
      join(
        __dirname.replace("server/dist/", ""),
        "parseAgenticWorkflowDefinition.ts",
      ),
      "utf8",
    );
    const defineAgenticWorkflowTs = readFileSync(
      join(__dirname.replace("server/dist/", ""), "defineAgenticWorkflow.ts"),
      "utf8",
    );
    assert.equal(
      parseAgenticWorkflowDefinitionTs.startsWith(
        `import ts from "typescript"`,
      ),
      true,
    );

    // Intercept http post call with definitions
    // const server = http.createServer((req, res) => {
    //   if (req.method === "POST" && req.url === "/parse-agentic-workflow") {
    //     let body = "";
    //     req.on("data", (chunk) => {
    //       body += chunk.toString();
    //     });
    //     req.on("end", () => {
    //       const data = JSON.parse(body);
    //       assert.equal(data.definitions.name, "Test Workflow");
    //       res.end(JSON.stringify({ result: "success" }));
    //     });
    //   } else {
    //     res.statusCode = 404;
    //     res.end();
    //   }
    // });
    // server.listen(3089, async () => {});
    const proxy = await createDockerMCPServerProxy();

    const result = await createContainer("test-container", {
      files: {
        Dockerfile: `
          FROM node:18
          WORKDIR /app
          COPY . .
          RUN npm install
          RUN npm run build
          CMD ["npm", "start"]
        `,
        "defineAgenticWorkflow.ts": defineAgenticWorkflowTs,
        "index.ts": workflowTs,
        "package.json": `
          {
            "name": "test-container",
            "version": "1.0.0",
            "main": "index.js",
            "scripts": {
              "build": "tsc",
              "start": "node index.js"
            },
            "dependencies": {
              "@types/node": "^22.15.2",
              "typescript": "^5.8.3"
            }
          }
         `,
        "tsconfig.json": `
          {
            "compilerOptions": {
              "target": "ES2020",
              "module": "CommonJS",
              "strict": true,
              "esModuleInterop": true,
              "skipLibCheck": true,
              "forceConsistentCasingInFileNames": true
            }
          }
         `,
      },
      environment: {
        DOCKER_MCP_ENDPOINT: proxy.base_url,
        MODE: "definitions-only",
      },
    });

    assert.equal(result, "finished");
    assert.equal(result.exitCode, 0);
    assert.equal(result.log.map((l) => l.text).join(""), "Hello, world!\n");
  });
});

const workflowTs = `
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
export default defineAgenticWorkflow(
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
`;
