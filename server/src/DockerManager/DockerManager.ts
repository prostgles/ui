import { randomUUID } from "crypto";
import { type DBS } from "..";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { createContainer } from "./createContainer";
import {
  createContainerJSONSchema,
  type CreateContainerParams,
} from "./createContainer.schema";
import { dockerMCPDatabaseRequestRouter } from "./dockerMCPDatabaseRequestRouter";
import { getContainerIPs } from "./getContainerIPs";
import { getDockerMCPTools } from "./getDockerMCPTools";

export type CreateContainerContext = {
  userId: string;
  chatId: number;
};

const containers: Record<
  string,
  CreateContainerContext & { chat: DBSSchema["llm_chats"] }
> = {};

const getContainerFromIP = (ip: string): DBSSchema["llm_chats"] | undefined => {
  const containerName = getContainerIPs(containers).find(
    (c) => c.ip === ip,
  )?.name;

  const containerInfo = containerName ? containers[containerName] : undefined;
  if (!containerName || !containerInfo) {
    return;
  }
  return containerInfo.chat;
};

let mcpRequestRouter:
  | ReturnType<typeof dockerMCPDatabaseRequestRouter>
  | undefined;

export const getDockerManager = async (dbs: DBS) => {
  mcpRequestRouter ??= dockerMCPDatabaseRequestRouter(getContainerFromIP);
  const { address, route } = await mcpRequestRouter;

  const createContainerInChat = async (
    args: CreateContainerParams,
    context: CreateContainerContext,
  ) => {
    const name = `${DOCKER_CONTAINER_NAME_PREFIX}-${Date.now()}-${randomUUID()}`;
    const chat = await dbs.llm_chats.findOne({ id: context.chatId });
    if (!chat) {
      throw new Error(`Chat with id ${context.chatId} not found`);
    }
    containers[name] = { ...context, chat };
    const containerResult = await createContainer(name, args).catch((error) => {
      console.error("Error creating container:", error);
    });
    delete containers[name];
    return containerResult;
  };

  return {
    createContainerInChat,
    address,
    route,
  };
};

export const getDockerMCP = async (
  dbs: DBS,
  chat: DBSSchema["llm_chats"] | undefined,
) => {
  const { tools, dockerManager } = await getDockerMCPTools(dbs);
  const mode = chat?.db_data_permissions?.Mode;
  const customRequests = `{ "tableName": string; "command": "select" | "insert" | "update" | "delete"; "data": any }`;
  const sqlRequests = `{ "sql": string }`;
  const databaseQueryDescription =
    !mode || mode === "None" ?
      "Access to the database is not allowed. If user wants to run queries, they need to set the Mode to Custom or SQL."
    : [
        `To run queries against the database you need to POST`,
        `to ${dockerManager.address.address}:${dockerManager.address.port}/${dockerManager.route} with the following JSON body:`,

        mode === "Custom" ? customRequests : sqlRequests,
      ].join(" ");
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
    toolSchemas,
    tools,
  };
};

export const DOCKER_CONTAINER_NAME_PREFIX = "prostgles-docker-mcp-sandbox";
