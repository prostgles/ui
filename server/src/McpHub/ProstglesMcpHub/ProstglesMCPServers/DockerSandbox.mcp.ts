import { DOCKER_USER_AGENT } from "@common/OAuthUtils";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { upsertSession } from "@src/authConfig/upsertSession";
import { randomUUID } from "crypto";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { createContainer } from "./DockerSandbox/createContainer";
import {
  DOCKER_CONTAINER_NAME_PREFIX,
  dockerContainerAuthRegistry,
} from "./DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import { dockerMCPServerProxy } from "./DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import { fetchTools } from "./DockerSandbox/fetchTools";

const definition = {
  icon_path: "Docker",
  label: "Docker Sandbox",
  description: "Run code in isolated Docker containers",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS["docker-sandbox"],
} as const satisfies ProstglesMcpServerDefinition;

let mcpRequestRouter: ReturnType<typeof dockerMCPServerProxy> | undefined;

const handler = {
  start: async (dbs) => {
    mcpRequestRouter ??= dockerMCPServerProxy();
    const { api_url, destroy } = await mcpRequestRouter;

    return {
      stop: () => {
        destroy();
      },
      tools: {
        create_container: async (args, context) => {
          const name = `${DOCKER_CONTAINER_NAME_PREFIX}-${Date.now()}-${randomUUID()}`;
          const chat = await dbs.llm_chats.findOne({ id: context.chat_id });
          const user = await dbs.users.findOne({ id: context.user_id });
          if (!chat) {
            throw new Error(`Chat with id ${context.chat_id} not found`);
          }
          if (!user) {
            throw new Error(`User with id ${context.user_id} not found`);
          }
          const database_config = await dbs.database_configs.findOne({
            $existsJoined: { connections: { is_state_db: true } },
          });
          if (!database_config) {
            throw new Error("No database_config found for state db connection");
          }
          const tokenForMCP = await upsertSession({
            db: dbs,
            ip: "127.0.0.1",
            user,
            user_agent: DOCKER_USER_AGENT,
            database_config,
          });
          const sid_token = tokenForMCP.sid;
          if (!sid_token) {
            throw new Error("Failed to create session for Docker MCP");
          }
          dockerContainerAuthRegistry.setContainerInfo(name, {
            chat,
            sid_token,
          });
          const containerResult = await createContainer(name, args).catch(
            (error) => {
              console.error("Error creating container:", error);
            },
          );
          dockerContainerAuthRegistry.deleteContainerInfo(name);
          return containerResult;
        },
      },
      fetchTools: (dbs, context) => fetchTools(api_url, dbs, context),
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const DockerSandboxMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
