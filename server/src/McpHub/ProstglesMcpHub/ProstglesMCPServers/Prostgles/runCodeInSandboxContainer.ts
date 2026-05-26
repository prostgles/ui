import { runContainerWithProxyAccess } from "@src/McpHub/DockerSandbox/runContainerWithProxyAccess";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";
import type { CreateContainerParams } from "./schemas/getContainerToolSchemas";
import { getSerialisableError } from "prostgles-types";
import { validateUserInput } from "./agenticWorkflow/definitionValidation/validateUserInput";
import { USER_INPUT_VALUE_ENV_VARIABLE_NAME } from "@common/mcp/runCodeInSandboxSchema";
import { connectionManager } from "@src/index";
import { validateUserInputDefinitions } from "./agenticWorkflow/definitionValidation/validateUserInputDefinitions";

const aborters = new Map<number, AbortController>();
export const stopContainer = (containerId: number) => {
  const aborter = aborters.get(containerId);
  if (!aborter) {
    throw new Error(`No running container found with id ${containerId}`);
  }
  aborter.abort();
  aborters.delete(containerId);
};

export const runCodeInSandboxContainer = async (
  args: CreateContainerParams,
  { user_id, chat, dbs, toolUseId, messageId, connection_id }: McpCallContext,
) => {
  if (!toolUseId) {
    throw new Error("toolUseId is required");
  }

  const activeConnection = connectionManager.getActiveConnection(connection_id);
  const tables = activeConnection.prgl.getSchema();

  if (args.userInput) {
    validateUserInputDefinitions(tables, args.userInput);
  }

  const userInputValidation =
    args.userInput &&
    validateUserInput(args.userInputValue ?? {}, args.userInput);

  await dbs.docker_containers.delete({
    chat_id: chat.id,
    tool_use_id: toolUseId,
  });
  const container = await dbs.docker_containers.insert(
    {
      user_id,
      chat_id: chat.id,
      configuration: args,
      state: {
        status: "stopped",
      },
      log: [],
      user_input_value: {},
      tool_use_id: toolUseId,
    },
    { returning: { id: 1 } },
  );
  const aborter = new AbortController();
  aborters.set(container.id, aborter);

  const res = await runContainerWithProxyAccess(
    dbs,
    {
      user_id,
      mcpToolsScope: {
        messageId,
        chat,
      },
    },
    {
      ...args,
      environment: {
        ...args.environment,
        [USER_INPUT_VALUE_ENV_VARIABLE_NAME]: JSON.stringify(
          !userInputValidation?.isValid ? {} : userInputValidation.value,
        ),
      },
      networkMode: args.networkMode || "bridge-internal",
      signal: aborter.signal,
    },
    (logs) => {
      void dbs.docker_containers.update(
        {
          id: container.id,
        },
        {
          log: logs.map((log) => ({
            type: log.type,
            text: log.text,
          })),
        },
      );
    },
  )
    .catch((e) => {
      void dbs.docker_containers.update(
        {
          id: container.id,
        },
        {
          state: {
            status: "error",
            message:
              e instanceof Error ?
                e.message
              : JSON.stringify(getSerialisableError(e)),
          },
          finished: new Date(),
        },
      );
      return Promise.reject(e);
    })
    .finally(() => {
      aborters.delete(container.id);
    });
  await dbs.docker_containers.update(
    {
      id: container.id,
    },
    {
      state:
        res.state === "finished" ?
          {
            status: "completed",
          }
        : {
            status: "error",
            message: res.state,
          },
      finished: new Date(),
    },
  );
  return res;
};
