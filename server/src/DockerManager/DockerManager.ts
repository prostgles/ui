import { DOCKER_USER_AGENT } from "@common/OAuthUtils";
import { randomUUID } from "crypto";
import { type DBS } from "..";
import { upsertSession } from "../authConfig/upsertSession";
import { createContainer } from "./createContainer";
import { type CreateContainerParams } from "./createContainer.schema";
import { dockerMCPServerProxy } from "./dockerMCPServerProxy/dockerMCPServerProxy";
import {
  DOCKER_CONTAINER_NAME_PREFIX,
  dockerContainerAuthRegistry,
  type CreateContainerContext,
} from "./dockerMCPServerProxy/dockerContainerAuthRegistry";

let mcpRequestRouter: ReturnType<typeof dockerMCPServerProxy> | undefined;

export const getDockerManager = async (dbs: DBS) => {
  mcpRequestRouter ??= dockerMCPServerProxy();
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
    dockerContainerAuthRegistry.setContainerInfo(name, {
      ...context,
      chat,
      sid_token,
    });
    const containerResult = await createContainer(name, args).catch((error) => {
      console.error("Error creating container:", error);
    });
    dockerContainerAuthRegistry.deleteContainerInfo(name);
    return containerResult;
  };

  return {
    createContainerInChat,
    address,
    api_url,
  };
};
