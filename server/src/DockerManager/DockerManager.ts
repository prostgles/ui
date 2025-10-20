import { randomUUID } from "crypto";
import { pickKeys } from "prostgles-types";
import { type DBS } from "..";
import { DOCKER_USER_AGENT } from "../../../common/OAuthUtils";
import type { DBSSchema } from "../../../common/publishUtils";
import { upsertSession } from "../authConfig/upsertSession";
import { createContainer } from "./createContainer";
import { type CreateContainerParams } from "./createContainer.schema";
import {
  dockerMCPDatabaseRequestRouter,
  type GetAuthContext,
} from "./dockerMCPDatabaseRequestRouter";
import { getContainerIPs } from "./getContainerIPs";
import { DOCKER_CONTAINER_NAME_PREFIX } from "./getDockerMCP";

export type CreateContainerContext = {
  userId: string;
  chatId: number;
};

const containers: Record<
  string,
  CreateContainerContext & { chat: DBSSchema["llm_chats"]; sid_token: string }
> = {};

const getContainerFromIP: GetAuthContext = (ip: string) => {
  const containerName = getContainerIPs(containers).find(
    (c) => c.ip === ip,
  )?.name;

  const containerInfo = containerName ? containers[containerName] : undefined;
  if (!containerName || !containerInfo) {
    return;
  }
  return pickKeys(containerInfo, ["chat", "sid_token"]);
};

let mcpRequestRouter:
  | ReturnType<typeof dockerMCPDatabaseRequestRouter>
  | undefined;

export const getDockerManager = async (dbs: DBS) => {
  mcpRequestRouter ??= dockerMCPDatabaseRequestRouter(getContainerFromIP);
  const { address, api_url } = await mcpRequestRouter;

  const createContainerInChat = async (
    args: CreateContainerParams,
    context: CreateContainerContext,
  ) => {
    const name = `${DOCKER_CONTAINER_NAME_PREFIX}-${Date.now()}-${randomUUID()}`;
    const chat = await dbs.llm_chats.findOne({ id: context.chatId });
    const user = await dbs.users.findOne({ id: context.userId });
    if (!chat) {
      throw new Error(`Chat with id ${context.chatId} not found`);
    }
    if (!user) {
      throw new Error(`User with id ${context.userId} not found`);
    }
    const tokenForMCP = await upsertSession({
      db: dbs,
      ip: "127.0.0.1",
      user,
      user_agent: DOCKER_USER_AGENT,
    });
    const sid_token = tokenForMCP.sid;
    if (!sid_token) {
      throw new Error("Failed to create session for Docker MCP");
    }
    containers[name] = { ...context, chat, sid_token };
    const containerResult = await createContainer(name, args).catch((error) => {
      console.error("Error creating container:", error);
    });
    delete containers[name];
    return containerResult;
  };

  return {
    createContainerInChat,
    address,
    api_url,
  };
};
