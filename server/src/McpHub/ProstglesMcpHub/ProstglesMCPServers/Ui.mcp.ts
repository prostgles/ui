import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import {
  getMCPFullToolName,
  getProstglesMCPFullToolName,
} from "@common/mcpUtils";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { connectionManager } from "@src/index";
import { statePrgl } from "@src/init/startProstgles";
import { isEmpty, pickKeys } from "prostgles-types";
import { getDockerMCPServerProxy } from "../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../ProstglesMCPServerTypes";
import { createAgenticWorkflow } from "./Prostgles/agenticWorkflow/createAgenticWorkflow";
import { getValidatedMcpServerToolsAllowed } from "./Prostgles/agenticWorkflow/definitionValidation/getValidatedMcpServerToolsAllowed";
import { getAgentConfigWithDefaults } from "./Prostgles/agenticWorkflow/proxyHandlers/getAgentConfigWithDefaults";
import { getAgenticWorkflowDockerCoreFiles } from "./Prostgles/agenticWorkflow/runtimeSetup/getAgenticWorkflowDockerCoreFiles";
import { getToolTypescriptSchemas } from "./Prostgles/agenticWorkflow/runtimeSetup/getToolTypescriptSchemas";
import { fetchTools } from "./Prostgles/fetchTools";
import { runCodeInSandboxContainer } from "./Prostgles/runCodeInSandboxContainer";
import { startAgent } from "./Prostgles/startAgent";
import { validateCreateDashboards } from "./Prostgles/validateCreateDashboards";
import { glob } from "glob";
import { DIRECTORIES } from "@src/electronConfig";
import { validateDatabaseAccessDefinitions } from "./Prostgles/agenticWorkflow/definitionValidation/validateDatabaseAccessDefinitions";

const serverName = "prostgles-ui" as const;
const tools = PROSTGLES_MCP_SERVERS_AND_TOOLS[serverName];
const definition = {
  icon_path: "CubeOutline",
  label: "Prostgles",
  description: "Tools to assist with Prostgles UI tasks",
  config_schema: undefined,
  tools,
} as const satisfies ProstglesMcpServerDefinition;

export const getRunTypescriptInNodejsFiles = (
  entrypointTs: string,
  packageDependencies: Record<string, string>,
) => {
  return {
    ...getAgenticWorkflowDockerCoreFiles(packageDependencies),
    "index.ts": entrypointTs,
  };
};

const handler = {
  start: (dbs) => {
    return {
      stop: async () => {
        await getDockerMCPServerProxy()?.then((s) => s.destroy());
      },
      tools: {
        run_code_in_sandbox: runCodeInSandboxContainer,
        run_typescript_in_nodejs: async (
          { entrypointTs, packageDependencies, ...otherOpts },
          context,
        ) => {
          return runCodeInSandboxContainer(
            {
              ...otherOpts,
              files: {
                ...getAgenticWorkflowDockerCoreFiles(packageDependencies),
                "index.ts": entrypointTs,
              },
            },
            context,
          );
        },
        ask_user_questions: () => {
          // never called
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return "" as any;
        },
        create_agent: async (
          { name, autoApproveAllTools, tools, timeout, ...config },
          { clientReq, connection_id, toolUseId, user_id, chat, messageId },
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
            const toolsWithInfo =
              tools &&
              (await getValidatedMcpServerToolsAllowed(dbs, tools, undefined));

            const createAgentFullToolName = getProstglesMCPFullToolName(
              "prostgles-ui",
              "create_agent",
            );
            const createAgentTool = toolsWithInfo?.find(
              (t) =>
                getMCPFullToolName(t.server_name, t.name) ===
                createAgentFullToolName,
            );
            if (createAgentTool) {
              throw new Error(
                `Tool "${createAgentFullToolName}" cannot be used as a tool within an agent created by the "${createAgentFullToolName}" tool to prevent privilege escalation and infinite recursion.`,
              );
            }

            const rawRes = await startAgent(
              undefined,
              {
                name: `Agent for toolUseId ${toolUseId}`,
                toolsWithInfo,
                configWithDefaults,
                autoApproveAllTools,
                requestTimestamp: new Date(),
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
                messageId,
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
        create_tables: async ({ ddlStatements }, { connection_id }) => {
          await validateDatabaseAccessDefinitions({
            connection_id,
            usedTables: [],
            databaseAccessDefinitions: {
              mode: "custom",
              ddlStatements,
              tablePermissions: {},
            },
            allowEmptyTablePermissions: true,
          });
          const connPrgl =
            connectionManager.getActiveConnectionSilentFail(connection_id);
          if (!connPrgl) {
            throw new Error(`Connection with id ${connection_id} not found`);
          }
          if (!ddlStatements) {
            throw new Error(`ddlStatements is required for create_tables tool`);
          }
          await connPrgl.prgl.sql(ddlStatements);
          return { data: [] };
        },
        request_tool_access: async (
          { databaseAccess, mcpServerTools },
          { connection_id },
        ) => {
          /**
           * For convenience, add latest configs to the configs state, so that if the user has already configured a server, it will be used automatically.
           */
          const latestConfigs =
            mcpServerTools &&
            !isEmpty(mcpServerTools) &&
            (await dbs.mcp_server_configs.find(
              {
                server_name: {
                  $in: Object.keys(mcpServerTools),
                },
              },
              { select: { server_name: 1, configId: { $max: ["id"] } } },
            ));

          const validatedTools =
            mcpServerTools &&
            (await getValidatedMcpServerToolsAllowed(
              dbs,
              mcpServerTools,
              !latestConfigs ? undefined : (
                Object.fromEntries(
                  latestConfigs.map((c) => [
                    c.server_name,
                    { configId: Number(c.configId) },
                  ]),
                )
              ),
            ));
          if (mcpServerTools && !validatedTools?.length) {
            throw new Error(
              `mcpServerTools is empty. Either exclude it or provide valid tool server names.`,
            );
          }

          const customAccess =
            databaseAccess?.mode === "custom" ? databaseAccess : undefined;

          await validateDatabaseAccessDefinitions({
            connection_id,
            usedTables: [],
            databaseAccessDefinitions: customAccess,
            allowEmptyTablePermissions: true,
          });
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
                config_id: t.configId ?? null,
              })) ?? [],
          };
        },
        create_agentic_workflow: createAgenticWorkflow,
        get_tool_list: async (_) => {
          const mcpTools = await getValidatedMcpServerToolsAllowed(
            dbs,
            "*",
            undefined,
          );
          return mcpTools.map(({ server_name, name }) => {
            return { server_name, tool_name: name };
          });
        },
        get_specific_tool_schemas: async ({ mcpServerTools, infoLevel }) => {
          return getToolTypescriptSchemas(
            dbs,
            mcpServerTools, // ?? "*",
            infoLevel,
          );
        },
        create_dashboards: async ({ prostglesWorkspaces }, ctx) => {
          return validateCreateDashboards(prostglesWorkspaces, ctx);
        },
        compact_context: async (_args, { chat }) => {
          const messageCount = await dbs.llm_messages.count({
            chat_id: chat.id,
          });
          if (!messageCount) {
            throw new Error("No messages to compact");
          }
          return "Done";
        },
        get_tables_metadata: async ({ tableNames }, { connection_id }) => {
          const con = await dbs.connections.findOne({
            id: connection_id,
          });
          if (!con) {
            throw new Error(`Connection with id ${connection_id} not found`);
          }
          return pickKeys(con.table_options ?? {}, tableNames);
        },
        set_tables_metadata: async ({ metadata }, { connection_id }) => {
          const con = await dbs.connections.findOne({
            id: connection_id,
          });
          if (!con) {
            throw new Error(`Connection with id ${connection_id} not found`);
          }
          await dbs.connections.update(
            { id: connection_id },
            {
              table_options: {
                ...con.table_options,
                ...(metadata as typeof con.table_options),
              },
            },
          );
        },
        find_icons: async ({ query }) => {
          const results = await glob("**/*.svg", {
            cwd: DIRECTORIES.CLIENT_ICONS,
            nodir: true,
            signal: AbortSignal.timeout(5_000),
          });

          return results
            .map((filePath) => {
              return filePath.slice(0, -4); // remove .svg extension
            })
            .filter((filePath) => {
              return (
                !query || filePath.toLowerCase().includes(query.toLowerCase())
              );
            });
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
