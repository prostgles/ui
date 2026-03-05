import { runContainerWithProxyAccess } from "@src/McpHub/DockerSandbox/runContainerWithProxyAccess";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";
import type { CreateContainerParams } from "./schemas/getCreateContainerToolSchema";

export const createContainer = async (
  args: CreateContainerParams,
  { user_id, chat, connection_id, dbs }: McpCallContext,
) => {
  const { db_data_permissions } = chat;

  return runContainerWithProxyAccess(
    dbs,
    {
      user_id,
      dbPermissions: {
        connection_id,
        db_data_permissions,
      },
    },
    {
      ...args,
      networkMode: args.networkMode || "bridge-internal",
    },
  );
};
