import {
  WORKFLOW_ENV_VARS,
  type ProxyCallData,
} from "./defineAgenticWorkflowHandlers.types";
const { DOCKER_MCP_ENDPOINT } = WORKFLOW_ENV_VARS;

const startTime = Date.now();
export const callWorkflowProxy = async (args: ProxyCallData) => {
  const logData: [string, ...any] = (() => {
    if (
      args.type === "db/execute_sql" ||
      args.type === "db/execute_readonly_sql"
    ) {
      return ["db.runSQL", args.type];
    }
    if (args.type === "agent") {
      return ["agent." + args.agentName, truncateString(args.input)];
    }
    if (args.type === "tool") {
      return [
        args.serverName,
        args.toolName,
        args.input && shortenJsonData(args.input),
      ];
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
  const route =
    args.type === "tool" ?
      [args.serverName, args.toolName].join("/")
    : args.type;
  const result = await fetch(`${DOCKER_MCP_ENDPOINT}/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      args.type.startsWith("db/") ? argsWithoutType
      : args.type === "tool" ? args.input
      : args,
    ),
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

const truncateString = (str: string, maxLength = 100): string => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength) + "... [truncated]";
};

const shortenJsonData = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const shortenedData: Record<string, unknown> = {};
  for (const key in data) {
    const value = data[key];
    if (typeof value === "string") {
      shortenedData[key] = truncateString(value);
    } else {
      shortenedData[key] = value;
    }
  }
  return shortenedData;
};
