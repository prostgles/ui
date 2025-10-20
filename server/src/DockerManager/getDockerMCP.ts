import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { DBSSchema } from "@common/publishUtils";
import { getProstglesDBTools } from "@src/publishMethods/askLLM/prostglesLLMTools/getProstglesDBTools";
import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  tryCatchV2,
} from "prostgles-types";
import type { DBS } from "..";
import { createContainerJSONSchema } from "./createContainer.schema";
import { getDockerMCPTools } from "./getDockerMCPTools";

export const getDockerMCPToolSchemas = async (
  dbs: DBS,
  chat: DBSSchema["llm_chats"] | undefined,
) => {
  const maybeDockerManager = await tryCatchV2(async () => {
    const { dockerManager } = await getDockerMCPTools(dbs);
    return dockerManager;
  });
  const dbTools = getProstglesDBTools(chat);
  const isDocker = Boolean(process.env.IS_DOCKER);

  const databaseQueryDescription =
    maybeDockerManager.hasError ?
      "Docker manager not available. Must have Docker installed."
    : !dbTools.length ?
      "Access to the database is not allowed. If user wants to run queries, they need to set the Mode to Custom or SQL."
    : [
        `To run queries against the database you need to POST JSON body parameters to ${maybeDockerManager.data.api_url}`,
        `The following endpoints are available:\n\n`,
        ...dbTools.map((t) => {
          const argTSSchema = JSON.stringify(
            omitKeys(getJSONBSchemaAsJSONSchema("", "", t.schema), [
              "$id",
              "$schema",
            ]),
          );
          return ` - /${t.tool_name} - ${t.description}. JSON body input schema: ${argTSSchema}  `;
        }),
        isDocker ?
          "DO NOT USE WORKHOST to connect to prostgles-ui-docker-mcp. Just specify network mode 'bridge' and it will work."
        : "",
      ].join("\n");
  const { description } = createContainerJSONSchema;
  if (!description) {
    throw new Error("createContainerJSONSchema must have a description");
  }
  const toolSchemas = [
    {
      name: "create_container",
      description: `${description}. ${databaseQueryDescription}`,
      inputSchema: createContainerJSONSchema,
    },
  ];

  return toolSchemas;
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
          return ` - /${t.tool_name} - ${t.description}. JSON body input schema: ${argTSSchema}  `;
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
