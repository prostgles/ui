import type { DBS } from "@src/index";
import { readFileSync } from "fs";
import { join } from "path";
import { getJSONBSchemaValidationError } from "prostgles-types";
import type {
  DbPermissions,
  McpProxyRequestContext,
} from "../../../DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import { runContainerWithProxyAccess } from "../../../DockerSandbox/runContainerWithProxyAccess";
import {
  END_OF_SCHEMA_PLACEHOLDER,
  type AgenticWorkflowDefinition,
  type ProxyCallData,
} from "./defineAgenticWorkflow";

const defineAgenticWorkflowDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "src",
  "McpHub",
  "ProstglesMcpHub",
  "ProstglesMCPServers",
  "Prostgles",
);
export const defineAgenticWorkflowTs = readFileSync(
  join(defineAgenticWorkflowDirectory, "defineAgenticWorkflow.ts"),
  "utf8",
);
export const defineAgenticWorkflowTsSchema = defineAgenticWorkflowTs.split(
  END_OF_SCHEMA_PLACEHOLDER,
)[0];

if (!defineAgenticWorkflowTs || !defineAgenticWorkflowTsSchema) {
  throw new Error("Failed to read defineAgenticWorkflow.ts");
}

export const createAgenticWorkflowContainer = async (
  dbs: DBS,
  {
    workflowTs,
    user_id,
  }: {
    workflowTs: string;
    user_id: string;
  },
  mode:
    | {
        type: "definitions-only";
        dbPermissions?: undefined;
        handler: (
          args: Extract<ProxyCallData, { type: "definitions" }>,
          ctx: McpProxyRequestContext,
        ) => void;
      }
    | {
        type: "full";
        definition: AgenticWorkflowDefinition;
        dbPermissions: DbPermissions;
        handler: (
          args: Extract<ProxyCallData, { type: "agent" }>,
          ctx: McpProxyRequestContext,
        ) => Promise<unknown>;
      },
) => {
  return runContainerWithProxyAccess(
    dbs,
    {
      user_id,
      dbPermissions: mode.dbPermissions,
      requestHandlers: {
        ["/definitions"]: {
          method: "POST",
          handler: (ctx, req, res) => {
            if (mode.type !== "definitions-only") {
              res
                .status(400)
                .json({ error: "Invalid request for current mode" });
              return;
            }
            const { data, error } = getJSONBSchemaValidationError(
              {
                type: { type: { enum: ["definitions"] }, definitions: "any" },
              } as const,
              req.body,
            );
            if (error !== undefined) {
              throw new Error("Invalid request data: " + error);
            }
            mode.handler(
              {
                ...data,
                //@ts-expect-error
                defineAgenticWorkflowTs,
              },
              ctx,
            );
          },
        },
        ["/agent"]: {
          method: "POST",
          handler: (ctx, req, res) => {
            if (mode.type !== "full") {
              res
                .status(400)
                .json({ error: "Invalid request for current mode" });
              return;
            }
            const { data, error } = getJSONBSchemaValidationError(
              {
                type: {
                  type: { enum: ["agent"] },
                  agentName: "string",
                  input: "string",
                },
              } as const,
              req.body,
            );
            if (error !== undefined) {
              throw new Error("Invalid request data: " + error);
            }
            mode
              .handler(data, ctx)
              .then((result) => {
                res.json(result);
              })
              .catch((error) => {
                console.error("Error in handler:", error);
                res.status(500).json({ error: "Internal server error" });
              });
          },
        },
      },
    },
    {
      networkMode: "bridge",
      timeout:
        mode.type === "full" ? mode.definition.timeOutInSeconds * 1000 : 30_000,
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
        "package.json": packageJson,
        "tsconfig.json": tsconfigJson,
      },
      environment: {
        MODE: mode.type,
      },
    },
  );
};

const packageJson = JSON.stringify({
  name: "agentic-workflow",
  version: "1.0.0",
  main: "index.js",
  scripts: {
    build: "tsc",
    start: "node index.js",
  },
  dependencies: {
    "@types/node": "^22.15.2",
    typescript: "^5.8.3",
    "prostgles-types": "^4.0.208",
  },
});

const tsconfigJson = JSON.stringify({
  compilerOptions: {
    target: "ES2020",
    module: "CommonJS",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
  },
});
