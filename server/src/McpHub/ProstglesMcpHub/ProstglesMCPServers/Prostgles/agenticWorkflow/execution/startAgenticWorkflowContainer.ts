import type { DBSSchema } from "@common/publishUtils";
import { startAgenticWorkflowSchema } from "@common/mcp/startAgenticWorkflowSchema";
import type { DBS } from "@src/index";
import {
  getJSONBSchemaValidationError,
  getKeys,
  getSerialisableError,
  pickKeys,
} from "prostgles-types";
import type {
  DbPermissions,
  DockerMCPServerProxyHandler,
  McpProxyRequestContext,
} from "../../../../../DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import { runContainerWithProxyAccess } from "../../../../../DockerSandbox/runContainerWithProxyAccess";
import type {
  AgenticWorkflowDefinition,
  ProxyCallData,
  ProxyCallDataDefinitions,
} from "../runtimeSdk/defineAgenticWorkflowHandlers.types";
import type { TableSchemaOpts } from "../runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";
import { getOrchestrationContainerFiles } from "../runtimeSetup/getOrchestrationContainerFiles";
import { getVolumesFromUserInput } from "./getVolumesFromUserInput";

export const startAgenticWorkflowContainer = async (
  dbs: DBS,
  {
    workflow_function_definition,
    package_dependencies,
    user_id,
    chat,
    connection_id,
    abortSignal,
    messageId,
  }: {
    workflow_function_definition: string;
    package_dependencies: undefined | Record<string, string>;
    user_id: string;
    chat: DBSSchema["llm_chats"];
    connection_id: string;
    abortSignal: AbortSignal;
    messageId: DBSSchema["llm_messages"]["id"];
  },
  mode:
    | {
        type: "definitions-only";
        dbPermissions?: undefined;
        tableSchemaOpts: TableSchemaOpts;
        handler: (
          args: Extract<ProxyCallData, { type: "definitions" }>,
          ctx: McpProxyRequestContext,
        ) => Promise<void> | void;
      }
    | {
        type: "full";
        workflowId: number;
        workflow: DBSSchema["agentic_workflows"];
        orchestratorChat: DBSSchema["llm_chats"];
        userInputValue: Record<string, unknown>;
        definition: AgenticWorkflowDefinition;
        dbPermissions: DbPermissions;
        executionMode: "parallel" | "series";
        handler: (
          args: Extract<ProxyCallData, { type: "agent" }>,
          ctx: McpProxyRequestContext,
        ) => Promise<unknown>;
      },
) => {
  const parsedUserInputValue =
    mode.type === "definitions-only" ?
      undefined
    : await getVolumesFromUserInput({
        userInput: mode.workflow.definition_data.userInput,
        userInputValues: mode.userInputValue,
      });
  const workflowRun =
    mode.type === "full" ?
      await dbs.agentic_workflow_runs.insert(
        {
          workflow_id: mode.workflowId,
          message_id: messageId,
          chat_id: chat.id,
          user_input_value: mode.userInputValue,
          log: [],
          state: { status: "running" },
          user_id,
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
        type: {
          type: { enum: ["agent"] },
          agentName: "string",
          input: "string",
        },
      } as const,
      req.body,
    );
    data satisfies Extract<ProxyCallData, { type: "agent" }> | undefined;
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
        res.status(500).json(getSerialisableError(error));
      });
  };
  const result = await runContainerWithProxyAccess(
    dbs,
    {
      user_id,
      mcpToolsScope:
        mode.type === "full" ?
          {
            messageId,
            chat: mode.orchestratorChat,
          }
        : undefined,
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
                  usedTables: "string[]",
                  definitions: {
                    type: pickKeys(
                      startAgenticWorkflowSchema,
                      getKeys({
                        agentDefinitions: 1,
                        databaseAccessDefinitions: 1,
                        name: 1,
                        userInput: 1,
                        orchestrationTools: 1,
                        containerConfiguration: 1,
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
            void mode.handler(data, ctx);
          },
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
      ...(mode.type === "full" ?
        pickKeys(mode.definition.containerConfiguration, [
          "timeout",
          "internetAccess",
        ])
      : {}),
      readOnly:
        mode.type === "full" ?
          mode.definition.containerConfiguration.readOnly
        : true,
      signal: abortSignal,
      networkMode:
        (
          mode.type === "full" &&
          mode.definition.containerConfiguration.internetAccess &&
          mode.definition.containerConfiguration.internetAccess !== "none"
        ) ?
          mode.definition.containerConfiguration.internetAccess
        : "bridge-internal",
      timeout:
        mode.type === "full" ?
          mode.definition.containerConfiguration.timeout
        : 30_000,
      volumes: parsedUserInputValue?.volumes,
      files: await getOrchestrationContainerFiles({
        dbs,
        workflowTs: workflow_function_definition,
        package_dependencies,
        tableSchemaOpts:
          mode.type === "definitions-only" ?
            mode.tableSchemaOpts
          : {
              type: "full",
              ddlStatements:
                (
                  mode.workflow.definition_data.databaseAccessDefinitions
                    ?.mode === "custom"
                ) ?
                  mode.workflow.definition_data.databaseAccessDefinitions
                    .ddlStatements
                : undefined,
            },
        connection_id,
      }),
      environment: {
        MODE: mode.type,
        USER_INPUT:
          mode.type === "full" ?
            JSON.stringify(parsedUserInputValue?.userInputWithOverrides ?? {})
          : "{}",
        EXECUTION_MODE: mode.type === "full" ? mode.executionMode : "series",
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
  ).catch((error: unknown) => {
    if (workflowRun) {
      void dbs.agentic_workflow_runs.update(
        { id: workflowRun.id },
        {
          state: {
            status: "error",
            message: JSON.stringify(getSerialisableError(error)),
          },
          finished: new Date(),
        },
      );
    }
    return Promise.reject(getSerialisableError(error));
  });

  if (workflowRun) {
    await dbs.agentic_workflow_runs
      .update(
        { id: workflowRun.id },
        {
          state: {
            status:
              result.state === "finished" ? "completed"
              : result.state === "timed-out" ? "timed-out"
              : result.state === "aborted" ? "stopped"
              : "error",
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
