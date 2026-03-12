import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { connectionManager } from "@src/index";
import { isEmpty } from "prostgles-types";
import { getDockerMCPServerProxy } from "../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { createAgenticWorkflow } from "./Prostgles/agenticWorkflow/createAgenticWorkflow";
import { getValidatedMcpServerToolsAllowed } from "./Prostgles/agenticWorkflow/definitionValidation/getValidatedMcpServerToolsAllowed";
import { getToolTypescriptSchemas } from "./Prostgles/agenticWorkflow/runtimeSetup/getToolTypescriptSchemas";
import { runCodeInSandboxContainer } from "./Prostgles/runCodeInSandboxContainer";
import { fetchTools } from "./Prostgles/fetchTools";

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
        run_code_in_sandbox: runCodeInSandboxContainer,
        ask_user_questions: () => {
          // never called
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return "" as any;
        },
        request_tool_access: async (
          { databaseAccess, mcpServerTools },
          { connection_id },
        ) => {
          const validatedTools =
            mcpServerTools &&
            (await getValidatedMcpServerToolsAllowed(dbs, mcpServerTools));
          if (mcpServerTools && !validatedTools?.length) {
            throw new Error(
              `mcpServerTools is empty. Either exclude it or provide valid tool server names.`,
            );
          }
          if (databaseAccess && databaseAccess.mode === "custom") {
            if (
              isEmpty(databaseAccess.tablePermissions) &&
              !databaseAccess.tableCreateStatements
            ) {
              throw new Error(
                `Custom database access must have either tablePermissions or tableCreateStatements`,
              );
            }
            const connPrgl =
              connectionManager.getActiveConnectionSilentFail(connection_id);
            if (!connPrgl) {
              throw new Error(`Connection with id ${connection_id} not found`);
            }
            Object.keys(databaseAccess.tablePermissions).forEach(
              (tableName) => {
                const matchingTable = connPrgl.prgl.db[tableName];
                if (!matchingTable || !matchingTable.find) {
                  const allTables = Object.keys(connPrgl.prgl.db)
                    .filter((k) => connPrgl.prgl.db[k]?.find)
                    .join(", ");
                  throw new Error(
                    `Table ${tableName} not found in current schema. Available tables: ${allTables}`,
                  );
                }
              },
            );
          }
          if (!mcpServerTools && !databaseAccess) {
            throw new Error(
              `At least one of mcpServerTools or databaseAccess must be provided`,
            );
          }
          return {
            validatedTools:
              validatedTools?.map((t) => ({
                id: t.id,
                server_name: t.server_name,
              })) ?? [],
          };
        },
        create_agentic_workflow: createAgenticWorkflow,
        get_tool_schemas: async ({ mcpServerTools }) => {
          return getToolTypescriptSchemas(dbs, mcpServerTools ?? "*");
        },
        create_dashboards: () => {
          return "Done";
        },
        compact_context: async (args, { chat }) => {
          const messageCount = await dbs.llm_messages.count({
            chat_id: chat.id,
          });
          if (!messageCount) {
            throw new Error("No messages to compact");
          }
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
