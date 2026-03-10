// import type { ProstglesDbTools } from "@common/prostglesMcp";
// import { getProperty, type JSONB } from "prostgles-types";
// export type ProxyDbCallData<
//   K extends keyof ProstglesDbTools = keyof ProstglesDbTools,
// > = {
//   type: "db";
//   command: K;
//   params: JSONB.GetObjectType<ProstglesDbTools[K]["schema"]["type"]>;
// };
import type {
  DatabaseHandler,
  DefineAgenticWorkflow,
} from "./defineAgenticWorkflow";
import { assertWorkflowStarted } from "./ensureWorkflowIsExecuted";
import { definitionHandler } from "./definitionHandler";
import { tableHandlers } from "./tableHandlers";
import { callWorkflowProxy } from "./callWorkflowProxy";
import { getOrchestrationToolHandlers } from "./orchestrationToolHandlers";
import { WORKFLOW_ENV_VARS } from "./defineAgenticWorkflowHandlers.types";

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

  if (!USER_INPUT) {
    throw new Error("USER_INPUT environment variable is not set");
  }

  const userInput = JSON.parse(USER_INPUT) as Parameters<typeof handler>[3];

  if (MODE === "definitions-only") {
    return definitionHandler(definitions);
  }

  const agentHandlersProxy = new Proxy({} as Parameters<typeof handler>[0], {
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

  return handler(
    agentHandlersProxy,
    {
      db: tableHandlers as DatabaseHandler["db"],
      runSQL: (sql, query_params, query_timeout) => {
        if (
          dbMode !== "execute_sql_with_commit" &&
          dbMode !== "execute_sql_with_rollback"
        ) {
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
      },
    },
    getOrchestrationToolHandlers(definitions) as Parameters<typeof handler>[2],
    userInput,
    setProgress,
  );
};
