import {
  getMCPFullToolName,
  getMCPToolNameParts,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import { getDockerMCPServerProxy } from "../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import { runContainerWithProxyAccess } from "../../DockerSandbox/runContainerWithProxyAccess";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { createAgenticWorkflow } from "./Prostgles/createAgenticWorkflow";
import { fetchTools } from "./Prostgles/fetchTools";
import { compile } from "json-schema-to-typescript";

const serverName = "prostgles-ui" as const;
const definition = {
  icon_path: "CubeOutline",
  label: "Prostgles",
  description: "Tools to assist with Prostgles UI tasks",
  tools: PROSTGLES_MCP_SERVERS_AND_TOOLS[serverName],
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: (dbs) => {
    return {
      stop: async () => {
        await getDockerMCPServerProxy()?.then((s) => s.destroy());
      },
      tools: {
        create_container: async (args, { user_id, chat, connection_id }) => {
          const { db_data_permissions } = chat;
          const autoApprovedPermissions =
            db_data_permissions?.mode && db_data_permissions.auto_approve ?
              db_data_permissions
            : undefined;
          return runContainerWithProxyAccess(
            dbs,
            {
              user_id,
              dbPermissions: autoApprovedPermissions && {
                connection_id,
                db_data_permissions: autoApprovedPermissions,
              },
            },
            {
              ...args,
              networkMode: args.networkMode || "bridge-internal",
            },
          );
        },
        ask_user_questions: async () => {
          // never called
        },
        suggest_agentic_workflow: createAgenticWorkflow,
        get_tool_schemas: async ({ toolNames }) => {
          const splitToolNames = toolNames?.map((name) => {
            const nameParts = getMCPToolNameParts(name);
            if (!nameParts) {
              throw new Error(
                `Invalid tool name: ${name}. Expected format: ${getMCPFullToolName("serverName", "toolName")}`,
              );
            }
            return nameParts;
          });
          const mcpTools = await dbs.mcp_server_tools.find(
            !splitToolNames?.length ?
              {}
            : {
                $and: splitToolNames.map(({ serverName, toolName }) => ({
                  name: toolName,
                  server_name: serverName,
                })),
              },
          );

          const getTsType = (
            schema: Record<string, unknown> | null | undefined,
          ) =>
            !schema ? "string" : (
              compile(schema, "ToolInput", {
                bannerComment: "",
              }).then((v) => v.slice(v.indexOf("{")))
            );

          const result = await Promise.all(
            mcpTools.map(async (tool) => {
              const argsTsSchema = await getTsType(tool.inputSchema);
              const outputTsSchema = await getTsType(tool.outputSchema);

              return [
                "/**",
                " * " + tool.description.split("\n").join("\n * "),
                " */",
                `${tool.server_name}--${tool.name} (args: ${argsTsSchema}): Promise<${outputTsSchema}>`,
              ].join("\n");
            }),
          );

          return result.join("\n");
        },
        suggest_dashboards: () => {
          return "Done";
        },
        suggest_tools_and_prompt: () => {
          // TODO: validate tools list
          return "Done";
        },
      },
      fetchTools,
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const ProstglesMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
