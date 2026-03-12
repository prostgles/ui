import {
  WORKFLOW_ENV_VARS,
  type ProxyCallData,
} from "./defineAgenticWorkflowHandlers.types";
const { DOCKER_MCP_ENDPOINT } = WORKFLOW_ENV_VARS;

const startTime = Date.now();
export const callWorkflowProxy = async (args: ProxyCallData) => {
  const route = args.type;
  const logData: [string, ...any] = (() => {
    if (
      args.type === "db/execute_sql_with_commit" ||
      args.type === "db/execute_readonly_sql"
    ) {
      return ["db.runSQL", args.type];
    }
    if (args.type === "agent") {
      return ["agent." + args.agentName, args.input];
    }
    if (args.type === "tool") {
      return ["agent." + args.name, args.input];
    }
    if (args.type === "progress") {
      const { percent, message } = args;
      return [
        "progress",
        typeof percent === "number" ? percent.toFixed(1) + "%" : percent,
        message,
      ];
    }

    if (args.type === "definitions") {
      return [args.type, args.definitions.name];
    }

    const command = args.type.split("/")[1];
    return [
      `db.${(args as Extract<ProxyCallData, { tableName: string }>).tableName}.${command}`,
    ];
  })();

  const { type, ...argsWithoutType } = args;
  const result = await fetch(`${DOCKER_MCP_ENDPOINT}/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args.type.startsWith("db/") ? argsWithoutType : args),
  });

  const elapsed = `T+ ${Date.now() - startTime}ms`;
  if (!result.ok) {
    console.error(elapsed, ...logData, "\n");
  } else {
    console.log(elapsed, ...logData, "\n");
  }
  const resCopy = result.clone();
  const data = await result.json().catch(() => resCopy.text());

  if (!result.ok) {
    console.error(`${logData[0]} failed`, data);
    return Promise.reject(data);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return data as any;
};
