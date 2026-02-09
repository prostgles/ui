import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { isDocker } from "@src/McpHub/utils";
import { type DBTool } from "@src/serverFunctions/askLLM/prostglesLLMTools/getAllowedDBToolSchemas";
import {
  getJSONBSchemaAsJSONSchema,
  omitKeys,
  type JSONB,
} from "prostgles-types";
import { DOCKER_MCP_ENDPOINT_ENV_VAR } from "../../../../DockerSandbox/runContainerWithProxyAccess";

const createContainerToolInfo =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["create_container"];

export const getCreateContainerToolSchema = (dbTools: DBTool[]) => {
  const databaseQueryDescription =
    !dbTools.length ?
      "Access to the database is not allowed. If user wants to run queries, they need to set the Mode to Custom or SQL."
    : [
        `To run queries against the database you need to POST JSON body parameters to the "${DOCKER_MCP_ENDPOINT_ENV_VAR}" environment variable endpoint:`,
        `e.g. using curl: \`curl -X POST $${DOCKER_MCP_ENDPOINT_ENV_VAR}/db/execute_sql_with_commit -H "Content-Type: application/json" -d '{"sql": "SELECT * FROM users;"}'\``,
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

  return {
    name: "create_container",
    description: `${createContainerToolInfo.description}. ${databaseQueryDescription}`,
    inputSchema: omitKeys(
      getJSONBSchemaAsJSONSchema("", "", createContainerSchema),
      ["$id", "$schema"],
    ) as McpTool["inputSchema"],
  };
};

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;

const createContainerSchema = PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"][
  "create_container"
].schema satisfies JSONB.JSONBSchema;
