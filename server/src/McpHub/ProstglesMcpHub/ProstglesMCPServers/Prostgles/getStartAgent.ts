import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { askLLM } from "@src/serverFunctions/askLLM/askLLM";
import type { ExecutionContext } from "prostgles-server";
import type { JSONB } from "prostgles-types";
import { getValidatedMcpServerToolsAllowed } from "./agenticWorkflow/definitionValidation/getValidatedMcpServerToolsAllowed";
import { getAgentConfigWithDefaults } from "./agenticWorkflow/proxyHandlers/getAgentConfigWithDefaults";
import type { AgentDefinition } from "./agenticWorkflow/runtimeSdk/defineAgenticWorkflow";
import { startAgent } from "./startAgent";

/** App-context adapter. Uses models and credentials already configured in Prostgles. */
export const getStartAgent =
  (
    dbs: DBS,
    connectionId: string,
    getExecution: () => ExecutionContext | undefined,
  ) =>
  async <const T extends AgentDefinition>({
    input,
    name = "Agent",
    autoApproveAllTools = false,
    timeout = 120_000,
    signal,
    databaseAccess,
    ...config
  }: T & {
    input?: string;
    name?: string;
    autoApproveAllTools?: boolean;
    /** Timeout in milliseconds, as in the existing agent runner. */
    timeout?: number;
    signal?: AbortSignal;
    databaseAccess?: DBSSchema["llm_chats"]["db_data_permissions"];
  }): Promise<JSONB.GetObjectType<T["outputSchema"]>> => {
    const execution = getExecution();
    if (!execution) {
      throw new Error("Execution context not available");
    }
    const { clientReq, user: requestUser, invocations } = execution;
    if (!requestUser) {
      throw new Error("Request user not available");
    }
    const [invocation] = invocations;
    if (!invocation) {
      throw new Error("No invocation found in the execution context");
    }

    const relatedRecord = (() => {
      if (invocation.type === "trigger") {
        const { tableName, rowParts } = invocation;
        return {
          tableName,
          rowParts,
        };
      }
      const firstRecord = invocation.relatedRecords[0];
      if (!firstRecord) return undefined;
      const { tableName, rowPart } = firstRecord;
      return {
        tableName,
        rowParts: [rowPart],
        functionName: invocation.functionName,
      };
    })();

    const { id } = requestUser;
    const user = await dbs.users.findOne({ id });
    if (!user) throw new Error("Agent user not found");
    const configWithDefaults = await getAgentConfigWithDefaults(
      { agentName: name, agentConfig: config, definition_override: null },
      dbs,
    );
    const toolsWithInfo =
      configWithDefaults.tools &&
      (await getValidatedMcpServerToolsAllowed(
        dbs,
        configWithDefaults.tools,
        configWithDefaults.mcpServerConfigs,
      ));
    const result = await startAgent(
      input,
      {
        name,
        configWithDefaults,
        toolsWithInfo,
        autoApproveAllTools,
        databaseAccess,
        requestTimestamp: new Date(),
      },
      {
        dbs,
        connectionId,
        userId: user.id,
        signal,
        started: Date.now(),
        timeout,
        askLLM: (args) =>
          askLLM({ ...args, dbs, user, clientReq, aborter: undefined }),
      },
      relatedRecord,
    );
    return result as JSONB.GetObjectType<T["outputSchema"]>;
  };
