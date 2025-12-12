import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBS } from "@src/index";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getProstglesDBTools } from "@src/publishMethods/askLLM/prostglesLLMTools/getProstglesDBTools";
import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  type JSONB,
} from "prostgles-types";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";

const createContainerToolInfo =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["docker-sandbox"]["create_container"];

export const fetchTools = async (
  apiUrl: string,
  dbs: DBS,
  context: McpCallContext,
) => {
  const chat = await dbs.llm_chats.findOne({ id: context.chat_id });
  const dbTools = getProstglesDBTools(chat);
  const isDocker = Boolean(process.env.IS_DOCKER);

  const databaseQueryDescription =
    !dbTools.length ?
      "Access to the database is not allowed. If user wants to run queries, they need to set the Mode to Custom or SQL."
    : [
        `To run queries against the database you need to POST JSON body parameters to ${apiUrl}`,
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

  return [
    {
      name: "create_container",
      description: `${createContainerToolInfo.description}. ${databaseQueryDescription}`,
      inputSchema: omitKeys(
        getJSONBSchemaAsJSONSchema("", "", createContainerSchema),
        ["$id", "$schema"],
      ) as McpTool["inputSchema"],
    },
  ];
};

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;

const createContainerSchema = PROSTGLES_MCP_SERVERS_AND_TOOLS["docker-sandbox"][
  "create_container"
].schema satisfies JSONB.JSONBSchema;
