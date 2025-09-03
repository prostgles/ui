import { assertJSONBObjectAgainstSchema } from "prostgles-types";
import type { DBS } from "..";
import { getDockerManager, type CreateContainerContext } from "./DockerManager";
import {
  createContainerJSONSchema,
  createContainerSchema,
} from "./createContainer.schema";
import type { McpToolCallResponse } from "../../../commonTypes/mcp";
import { AddressInfo } from "net";
import { DBSSchema } from "@common/publishUtils";
import { DOCKER_MCP_ENDPOINT } from "./dockerMCPDatabaseRequestRouter";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";

export const getDockerMCP = async (
  dbs: DBS,
  chat: DBSSchema["llm_chats"] | undefined,
) => {
  const dockerManager = await getDockerManager(dbs);
  const tools = {
    createContainer: async (args: unknown, context: CreateContainerContext) => {
      assertJSONBObjectAgainstSchema(
        createContainerSchema.type,
        args,
        "createContainer args",
      );
      try {
        const containerResult = await dockerManager.createContainerInChat(
          args,
          context,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Sandbox created successfully",
                  result: containerResult,
                },
                null,
                2,
              ),
            },
          ],
        } satisfies McpToolCallResponse;
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        } satisfies McpToolCallResponse;
      }
    },
  };
  const toolSchemas = getDockerMCPToolSchemas(dockerManager.address, chat);

  return {
    serverName:
      "docker-sandbox" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS,
    tools,
    toolSchemas,
    dockerManager,
  };
};
getDockerMCP.serverName =
  "docker-sandbox" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;

export const getDockerMCPToolSchemas = (
  address: AddressInfo | undefined,
  chat: DBSSchema["llm_chats"] | undefined,
) => {
  const mode = chat?.db_data_permissions?.Mode;
  const customRequests = `{ "tableName": string; "command": "select" | "insert" | "update" | "delete"; "data": any }`;
  const sqlRequests = `{ "sql": string }`;
  const databaseQueryDescription =
    !address ? "Docker might not be installed"
    : !mode || mode === "None" ?
      "Access to the database is not allowed. If user wants to run queries, they need to set the Mode to Custom or SQL."
    : [
        `To run queries against the database you need to POST`,
        `to ${address.address}:${address.port}/${DOCKER_MCP_ENDPOINT} with the following JSON body:`,

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

  return toolSchemas;
};
