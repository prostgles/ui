import { callWorkflowProxy } from "./callWorkflowProxy";
import type { DefineAgenticWorkflow } from "./defineAgenticWorkflow";
import { WORKFLOW_ENV_VARS } from "./defineAgenticWorkflowHandlers.types";
import { definitionHandler } from "./definitionHandler";
import { assertWorkflowStarted } from "./ensureWorkflowIsExecuted";
import { getOrchestrationToolHandlers } from "./orchestrationToolHandlers";
import { tableHandlers } from "./tableHandlers";

const { DOCKER_MCP_ENDPOINT, MODE, USER_INPUT, EXECUTION_MODE } =
  WORKFLOW_ENV_VARS;

const runState = { wasStarted: false };
assertWorkflowStarted(runState);

/**
 * Execute agent invocations in series to reduce risk of avoid runaway costs and allow for human feedback between steps.
 */
export const createQueue = () => {
  let agentExecutionChain: Promise<void> = Promise.resolve();

  const enqueueAgentExecution = <T>(
    agentExecution: () => Promise<T>,
  ): Promise<T> => {
    const executionPromise = agentExecutionChain.then(agentExecution);
    agentExecutionChain = executionPromise.catch(() => {}) as Promise<void>;
    return executionPromise;
  };

  return {
    enqueueAgentExecution,
  };
};

export const defineAgenticWorkflow: DefineAgenticWorkflow = async (
  definitions,
  handler,
) => {
  runState.wasStarted = true;

  if (!["series", "parallel"].includes(EXECUTION_MODE ?? "")) {
    throw new Error(
      `Invalid EXECUTION_MODE environment variable: ${EXECUTION_MODE}. Must be either "series" or "parallel".`,
    );
  }

  if (!DOCKER_MCP_ENDPOINT) {
    throw new Error("DOCKER_MCP_ENDPOINT environment variable is not set");
  }

  type ArgsObject = Parameters<typeof handler>[0];
  if (!USER_INPUT) {
    throw new Error("USER_INPUT environment variable is not set");
  }

  const userInputValues = JSON.parse(
    USER_INPUT,
  ) as ArgsObject["userInputValues"];

  if (MODE === "definitions-only") {
    return definitionHandler(definitions);
  }

  const { enqueueAgentExecution } = createQueue();

  const agentHandlersProxy = new Proxy({} as ArgsObject["agentHandlers"], {
    get(_target, prop: string) {
      if (typeof prop !== "string") return undefined;
      if (!definitions.agentDefinitions) {
        throw new Error(
          `No agents are defined for this workflow, but tried to access agent "${prop}"`,
        );
      }
      if (!(prop in definitions.agentDefinitions)) {
        throw new Error(`Agent "${prop}" is not defined in agentDefinitions`);
      }
      return (input: string) => {
        if (EXECUTION_MODE === "series") {
          /** The queue is done inside this sdk runtime to improve the activity items timings/order */
          return enqueueAgentExecution(() => {
            return callWorkflowProxy({ type: "agent", agentName: prop, input });
          });
        }
        return callWorkflowProxy({ type: "agent", agentName: prop, input });
      };
    },
  });

  const accessMode = definitions.databaseAccessDefinitions?.mode;

  const setProgress = (percent: number, message = "") => {
    return callWorkflowProxy({
      type: "progress",
      percent,
      message,
    }).catch((err) => {
      console.error("Failed to set progress:", err);
    });
  };

  return handler({
    agentHandlers: agentHandlersProxy,
    tableHandlers: tableHandlers as ArgsObject["tableHandlers"],
    runSQL: ((sql, query_params, query_timeout) => {
      if (
        accessMode !== "execute_sql" &&
        accessMode !== "execute_readonly_sql"
      ) {
        throw new Error(
          `Database access is not enabled for this workflow, but tried to run SQL with args: ${JSON.stringify(
            sql,
          )}`,
        );
      }
      return callWorkflowProxy({
        type: `db/${accessMode}` as const,
        sql,
        query_params,
        query_timeout,
      });
    }) as ArgsObject["runSQL"],
    orchestratorToolHandlers: getOrchestrationToolHandlers(
      definitions,
    ) as ArgsObject["orchestratorToolHandlers"],
    userInputValues,
    setProgress,
  });
};
