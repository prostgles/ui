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
import { statePrgl } from "@src/init/startProstgles";
import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import { startAgent } from "./Prostgles/startAgent";
import { getAgentConfigWithDefaults } from "./Prostgles/agenticWorkflow/proxyHandlers/getAgentConfigWithDefaults";

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
        create_agent: async (
          { name, autoApproveAllTools, tools, timeout, ...config },
          { clientReq, connection_id, toolUseId, user_id, chat },
        ) => {
          if (!statePrgl) {
            throw new Error("Prostgles state is not initialized");
          }
          const { clientMethods } = await statePrgl.getClientDBHandlers(
            clientReq,
            {
              methods: { askLLM: true },
            },
          );
          const dbsClientFunctions = clientMethods as unknown as {
            [K in keyof GeneratedFunctionSchema]: {
              run: GeneratedFunctionSchema[K];
            };
          };

          const configWithDefaults = await getAgentConfigWithDefaults(
            {
              agentName: name,
              agentConfig: {
                ...config,
                outputSchema: { result: { type: "string" } },
              },
              definition_override: null,
            },
            dbs,
          );
          try {
            const rawRes = await startAgent(
              undefined,
              {
                name: `Agent for toolUseId ${toolUseId}`,
                toolsWithInfo:
                  tools &&
                  (await getValidatedMcpServerToolsAllowed(dbs, tools)),
                configWithDefaults,
                autoApproveAllTools,
              },
              {
                askLLM: dbsClientFunctions.askLLM.run,
                userId: user_id,
                connectionId: connection_id,
                dbs,
                signal: undefined,
                started: Date.now(),
                timeout,
                chatId: chat.id,
              },
            );
            const res = rawRes as {
              result: string | Record<string, unknown>;
            };
            return {
              success: true,
              result:
                typeof res.result === "string" ?
                  res.result
                : JSON.stringify(res),
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            } as const;
          }
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
          if (databaseAccess && typeof databaseAccess !== "string") {
            const tablePermissions = databaseAccess;
            if (isEmpty(tablePermissions)) {
              throw new Error(
                `Custom database access must have at least one table permission defined`,
              );
            }
            const connPrgl =
              connectionManager.getActiveConnectionSilentFail(connection_id);
            if (!connPrgl) {
              throw new Error(`Connection with id ${connection_id} not found`);
            }
            Object.keys(tablePermissions).forEach((tableName) => {
              const matchingTable = connPrgl.prgl.db[tableName];
              if (!matchingTable || !matchingTable.find) {
                const allTables = Object.keys(connPrgl.prgl.db)
                  .filter((k) => connPrgl.prgl.db[k]?.find)
                  .join(", ");
                throw new Error(
                  `Table ${tableName} not found in current schema. Available tables: ${allTables}`,
                );
              }
            });
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
        get_tool_schemas: async ({ mcpServerTools, infoLevel }) => {
          return getToolTypescriptSchemas(
            dbs,
            mcpServerTools ?? "*",
            infoLevel,
          );
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

export const ProstglesUiMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
