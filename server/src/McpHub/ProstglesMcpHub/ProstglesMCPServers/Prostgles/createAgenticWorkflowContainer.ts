import type { DBS } from "@src/index";
import { readFileSync } from "fs";
import { join } from "path";
import { getJSONBSchemaValidationError, omitKeys } from "prostgles-types";
import type {
  DbPermissions,
  McpProxyRequestContext,
} from "../../../DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import { runContainerWithProxyAccess } from "../../../DockerSandbox/runContainerWithProxyAccess";
import {
  END_OF_SCHEMA_PLACEHOLDER,
  type AgenticWorkflowDefinition,
  type DefineAgenticWorkflow,
  type ProxyCallData,
} from "./defineAgenticWorkflow";
import { startAgenticWorkflowSchema } from "@src/tableConfig/startAgenticWorkflowSchema";

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
    chat_id,
  }: {
    workflowTs: string;
    user_id: string;
    chat_id: number;
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
        workflowId: number;
        userInputValue: Record<string, unknown>;
        definition: AgenticWorkflowDefinition;
        dbPermissions: DbPermissions;
        handler: (
          args: Extract<ProxyCallData, { type: "agent" }>,
          ctx: McpProxyRequestContext,
        ) => Promise<unknown>;
      },
) => {
  const workflowRun =
    mode.type === "full" ?
      await dbs.agentic_workflow_runs.insert(
        {
          workflow_id: mode.workflowId,
          chat_id,
          user_input_value: mode.userInputValue as any,
          log: [],
        },
        { returning: "*" },
      )
    : undefined;
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
                type: {
                  type: { enum: ["definitions"] },
                  definitions: {
                    type: omitKeys(startAgenticWorkflowSchema, [
                      "chatId",
                      "workflowTs",
                      "userInputValue",
                      "workflowId",
                    ]),
                  },
                },
              } as const,
              req.body,
            );
            if (error !== undefined) {
              throw new Error("Invalid request data: " + error);
            }
            type AgentWorkflowDefinitions =
              Parameters<DefineAgenticWorkflow>[0];
            data.definitions satisfies AgentWorkflowDefinitions;
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
          ENV NPM_CONFIG_UPDATE_NOTIFIER=false
          RUN npm install --silent --quiet
          RUN npm run build
          CMD ["npm", "start", "--silent"]
        `,
        "defineAgenticWorkflow.ts": defineAgenticWorkflowTs,
        "index.ts": workflowTs,
        "package.json": packageJson,
        "tsconfig.json": tsconfigJson,
      },
      environment: {
        MODE: mode.type,
        USER_INPUT:
          mode.type === "full" ? JSON.stringify(mode.userInputValue) : "{}",
      },
    },
    (log) => {
      if (!workflowRun) return;
      void dbs.agentic_workflow_runs
        .update(
          { id: workflowRun.id },
          {
            log,
          },
        )
        .catch((e) => {
          console.error("Failed to update workflow log:", e);
        });
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
