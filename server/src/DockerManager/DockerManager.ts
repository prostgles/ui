import { randomUUID } from "crypto";
import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  pickKeys,
} from "prostgles-types";
import { type DBS } from "..";
import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "../../../common/prostglesMcp";
import type { DBSSchema } from "../../../common/publishUtils";
import { upsertSession } from "../authConfig/upsertSession";
import { getProstglesDBTools } from "../publishMethods/askLLM/prostglesLLMTools/getProstglesDBTools";
import { createContainer } from "./createContainer";
import {
  createContainerJSONSchema,
  type CreateContainerParams,
} from "./createContainer.schema";
import {
  dockerMCPDatabaseRequestRouter,
  type GetAuthContext,
} from "./dockerMCPDatabaseRequestRouter";
import { getContainerIPs } from "./getContainerIPs";
import { getDockerMCPTools } from "./getDockerMCPTools";

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
      user_agent: "docker-mcp",
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

export const getDockerMCP = async (
  dbs: DBS,
  chat: DBSSchema["llm_chats"] | undefined,
) => {
  const { tools, dockerManager } = await getDockerMCPTools(dbs);
  const dbTools = getProstglesDBTools(chat);
  const isDocker = Boolean(process.env.IS_DOCKER);

  const databaseQueryDescription =
    !dbTools.length ?
      "Access to the database is not allowed. If user wants to run queries, they need to set the Mode to Custom or SQL."
    : [
        `To run queries against the database you need to POST JSON body parameters to ${dockerManager.api_url}`,
        `The following endpoints are available:\n\n`,
        ...dbTools.map((t) => {
          const argTSSchema = JSON.stringify(
            omitKeys(getJSONBSchemaAsJSONSchema("", "", t.schema), [
              "$id",
              "$schema",
            ]),
          );
          return `/${t.tool_name} - ${t.description}. JSON body input schema: ${argTSSchema}`;
        }),
        isDocker ?
          "DO NOT USE WORKHOST to connect to prostgles-ui-docker-mcp. Just specify network mode 'bridge' and it will work."
        : "",
      ].join("\n");
  const { description } = createContainerJSONSchema;
  if (!description)
    throw new Error("createContainerJSONSchema must have a description");
  const toolSchemas = [
    {
      name: "create_container",
      description: `${description}. ${databaseQueryDescription}`,
      inputSchema: createContainerJSONSchema,
    },
  ];
  return {
    serverName:
      "docker-sandbox" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS,
    toolSchemas,
    tools,
  };
};
getDockerMCP.serverName =
  "docker-sandbox" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;

export const DOCKER_CONTAINER_NAME_PREFIX = "prostgles-docker-mcp-sandbox";
