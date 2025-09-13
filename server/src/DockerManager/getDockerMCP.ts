import type { McpToolCallResponse } from "@common/mcp";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { DBSSchema } from "@common/publishUtils";
import { getProstglesDBTools } from "@src/publishMethods/askLLM/prostglesLLMTools/getProstglesDBTools";
import {
  assertJSONBObjectAgainstSchema,
  getJSONBSchemaAsJSONSchema,
  omitKeys,
} from "prostgles-types";
import type { DBS } from "..";
import { getDockerManager, type CreateContainerContext } from "./DockerManager";
import {
  createContainerJSONSchema,
  createContainerSchema,
} from "./createContainer.schema";
import { getDockerMCPTools } from "./getDockerMCPTools";

// export const getDockerMCP = async (
//   dbs: DBS,
//   chat: DBSSchema["llm_chats"] | undefined,
// ) => {
//   const dockerManager = await getDockerManager(dbs);
//   const tools = {
//     createContainer: async (args: unknown, context: CreateContainerContext) => {
//       assertJSONBObjectAgainstSchema(
//         createContainerSchema.type,
//         args,
//         "createContainer args",
//       );
//       try {
//         const containerResult = await dockerManager.createContainerInChat(
//           args,
//           context,
//         );

//         return {
//           content: [
//             {
//               type: "text",
//               text: JSON.stringify(
//                 {
//                   success: true,
//                   message: "Sandbox created successfully",
//                   result: containerResult,
//                 },
//                 null,
//                 2,
//               ),
//             },
//           ],
//         } satisfies McpToolCallResponse;
//       } catch (error) {
//         return {
//           isError: true,
//           content: [
//             {
//               type: "text",
//               text: `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`,
//             },
//           ],
//         } satisfies McpToolCallResponse;
//       }
//     },
//   };
//   const toolSchemas = await getDockerMCPToolSchemas(dbs, chat);

//   return {
//     serverName:
//       "docker-sandbox" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS,
//     tools,
//     toolSchemas,
//     dockerManager,
//   };
// };
// getDockerMCP.serverName =
//   "docker-sandbox" satisfies keyof typeof PROSTGLES_MCP_SERVERS_AND_TOOLS;

export const getDockerMCPToolSchemas = async (
  dbs: DBS,
  chat: DBSSchema["llm_chats"] | undefined,
) => {
  const { dockerManager } = await getDockerMCPTools(dbs);
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
