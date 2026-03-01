import type { DBS } from "@src/index";
import { startAgenticWorkflowSchema } from "@src/tableConfig/startAgenticWorkflowSchema";
import {
  getJSONBSchemaValidationError,
  getKeys,
  pickKeys,
} from "prostgles-types";
import type {
  DbPermissions,
  DockerMCPServerProxyHandler,
  McpProxyRequestContext,
} from "../../../DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import { runContainerWithProxyAccess } from "../../../DockerSandbox/runContainerWithProxyAccess";
import { AGENTIC_WORKFLOW_FILES } from "./AGENTIC_WORKFLOW_FILES";
import type {
  AgenticWorkflowDefinition,
  ProxyCallData,
  ProxyCallDataDefinitions,
} from "./defineAgenticWorkflowHandlers";

export const startAgenticWorkflowContainer = async (
  dbs: DBS,
  {
    workflowTs,
    user_id,
    chat_id,
    abortSignal,
  }: {
    workflowTs: string;
    user_id: string;
    chat_id: number;
    abortSignal: AbortSignal;
  },
  mode:
    | {
        type: "definitions-only";
        dbPermissions?: undefined;
        handler: (
          args: Extract<ProxyCallData, { type: "definitions" }>,
          ctx: McpProxyRequestContext,
        ) => Promise<void>;
      }
    | {
        type: "full";
        workflowId: number;
        messageId: string;
        userInputValue: Record<string, unknown>;
        definition: AgenticWorkflowDefinition;
        dbPermissions: DbPermissions;
        handler: (
          args: Extract<ProxyCallData, { type: "agent" } | { type: "tool" }>,
          ctx: McpProxyRequestContext,
        ) => Promise<unknown>;
      },
) => {
  const workflowRun =
    mode.type === "full" ?
      await dbs.agentic_workflow_runs.insert(
        {
          workflow_id: mode.workflowId,
          message_id: mode.messageId,
          chat_id,
          user_input_value: mode.userInputValue,
          log: [],
          state: { status: "running" },
        },
        { returning: "*" },
      )
    : undefined;

  const mainHandler: DockerMCPServerProxyHandler = (ctx, req, res) => {
    if (mode.type !== "full") {
      res.status(400).json({ error: "Invalid request for current mode" });
      return;
    }
    const { data, error } = getJSONBSchemaValidationError(
      {
        oneOfType: [
          {
            type: { enum: ["agent"] },
            agentName: "string",
            input: "string",
          },
          {
            type: { enum: ["tool"] },
            name: "string",
            input: {
              oneOf: [
                { enum: [undefined] },
                {
                  record: {
                    values: "unknown",
                  },
                },
              ],
            },
          },
        ],
      } as const,
      req.body,
    );
    data satisfies
      | Extract<ProxyCallData, { type: "agent" } | { type: "tool" }>
      | undefined;
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
  };
  const result = await runContainerWithProxyAccess(
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
                  newTables: {
                    arrayOfType: {
                      name: "string",
                      schema: { type: "string", optional: true },
                      columns: "unknown[]",
                      ifNotExists: {
                        type: "boolean",
                        optional: true,
                      },
                    },
                  },
                  usedTables: "string[]",
                  definitions: {
                    type: pickKeys(
                      startAgenticWorkflowSchema,
                      getKeys({
                        agentDefinitions: 1,
                        toolDefinitions: 1,
                        databaseAccessDefinitions: 1,
                        name: 1,
                        timeOutInSeconds: 1,
                        userInput: 1,
                        workflowAllowedTools: 1,
                      } satisfies Record<
                        keyof Extract<
                          ProxyCallData,
                          { type: "definitions" }
                        >["definitions"],
                        1
                      >),
                    ),
                  },
                },
              } as const,
              req.body,
            );

            if (error !== undefined) {
              throw new Error("Invalid request data: " + error);
            }
            data satisfies undefined | ProxyCallDataDefinitions;
            mode
              .handler(data, ctx)
              .then(() => {
                res.json({ success: true });
              })
              .catch((error) => {
                res
                  .status(500)
                  .json({ error: "Internal server error: " + String(error) });
              });
          },
        },
        ["/tool"]: {
          method: "POST",
          handler: mainHandler,
        },
        ["/agent"]: {
          method: "POST",
          handler: mainHandler,
        },
        ["/progress"]: {
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
                  type: { enum: ["progress"] },
                  percent: "number",
                  message: { type: "string" },
                },
              } as const,
              req.body,
            );

            data satisfies
              | Extract<ProxyCallData, { type: "progress" }>
              | undefined;

            if (error !== undefined) {
              throw new Error("Invalid request data: " + error);
            }

            if (!workflowRun) {
              res.status(500).json({ error: "Workflow run not found" });
              return;
            }
            void dbs.agentic_workflow_runs
              .update(
                { id: workflowRun.id },
                {
                  state: {
                    $merge: [
                      {
                        progressPercent: data.percent,
                        message: data.message,
                      },
                    ],
                  },
                },
              )
              .then(() => {
                res.json({ success: true });
              })
              .catch((e) => {
                console.error("Failed to update workflow log:", e);
              });
          },
        },
      },
    },
    {
      signal: abortSignal,
      // networkMode: "bridge",
      networkMode: "bridge-internal",
      timeout:
        mode.type === "full" ? mode.definition.timeOutInSeconds * 1000 : 30_000,
      files: {
        Dockerfile: `
          FROM node:22-slim
          WORKDIR /app
          COPY . .
          ENV NPM_CONFIG_UPDATE_NOTIFIER=false
          RUN npm install --silent
          RUN npm run build
          CMD ["npm", "start", "--silent"]
        `,
        ...AGENTIC_WORKFLOW_FILES,
        "index.ts": workflowTs,
        "package.json": getPackageJson(mode.type === "definitions-only"),
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

  if (workflowRun) {
    await dbs.agentic_workflow_runs
      .update(
        { id: workflowRun.id },
        {
          state: {
            status: result.state === "finished" ? "completed" : "error",
          },
          finished: new Date(),
          log: result.log,
        },
      )
      .catch((e) => {
        console.error("Failed to update workflow log:", e);
      });
  }
  return result;
};

const getPackageJson = (forDefinitions: boolean) =>
  JSON.stringify({
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
      ...(forDefinitions ? { "pgsql-ast-parser": "^12.0.2" } : {}),
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
