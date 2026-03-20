import { callWorkflowProxy } from "./callWorkflowProxy";
import type { DefineAgenticWorkflow } from "./defineAgenticWorkflow";
import { WORKFLOW_ENV_VARS } from "./defineAgenticWorkflowHandlers.types";
import { definitionHandler } from "./definitionHandler";
import { assertWorkflowStarted } from "./ensureWorkflowIsExecuted";
import { getOrchestrationToolHandlers } from "./orchestrationToolHandlers";
import { tableHandlers } from "./tableHandlers";

const { DOCKER_MCP_ENDPOINT, MODE, USER_INPUT } = WORKFLOW_ENV_VARS;

const runState = { wasStarted: false };
assertWorkflowStarted(runState);

export const defineAgenticWorkflow: DefineAgenticWorkflow = async (
  definitions,
  handler,
) => {
  runState.wasStarted = true;
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
      return (input: string) =>
        callWorkflowProxy({ type: "agent", agentName: prop, input });
    },
  });

  const dbMode = definitions.databaseAccessDefinitions?.mode;

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
      if (dbMode !== "execute_sql" && dbMode !== "execute_readonly_sql") {
        throw new Error(
          `Database access is not enabled for this workflow, but tried to run SQL with args: ${JSON.stringify(
            sql,
          )}`,
        );
      }
      return callWorkflowProxy({
        type: `db/${dbMode}` as const,
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
