import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { statePrgl } from "@src/init/startProstgles";
import type { AuthClientRequest } from "prostgles-server";
import { startAgent } from "../../startAgent";
import { getValidatedMcpServerToolsAllowed } from "../definitionValidation/getValidatedMcpServerToolsAllowed";
import type { DefineAgenticWorkflow } from "../runtimeSdk/defineAgenticWorkflow";
import { createQueue } from "../runtimeSdk/defineAgenticWorkflowHandlers";
import { getAgentConfigWithDefaults } from "./getAgentConfigWithDefaults";
import { setupOrchestrationToolPermissions } from "./setupOrchestrationToolPermissions";

export const createWorkflowExecutionHandlers = async <
  P extends DefineAgenticWorkflow,
>(
  {
    agentDefinitions,
    containerConfiguration,
    signal,
    definition_override,
    orchestrationTools,
    databaseAccessDefinitions,
    mode,
    message_id,
  }: Parameters<P>[0] & {
    signal?: AbortSignal;
    mode: "definitions-only" | "full";
  } & Pick<
      DBSSchema["agentic_workflows"],
      "definition_override" | "message_id"
    >,
  {
    dbs,
    chatId,
    userId,
    connectionId,
    clientReq,
  }: {
    dbs: DBS;
    chatId: number;
    userId: string;
    connectionId: string;
    clientReq: AuthClientRequest;
  },
  {
    runInSequence = true,
    autoApproveAllTools = false,
  }: {
    runInSequence?: boolean;
    autoApproveAllTools?: boolean;
  },
) => {
  if (!statePrgl) {
    throw new Error("Prostgles state is not initialized");
  }
  const { clientMethods } = await statePrgl.getClientDBHandlers(clientReq, {
    methods: { askLLM: true },
  });
  const dbsClientFunctions = clientMethods as unknown as {
    [K in keyof GeneratedFunctionSchema]: {
      run: GeneratedFunctionSchema[K];
    };
  };
  const agentHandlers = new Map<
    string,
    (agentInput: string, requestTimestamp: Date) => Promise<any>
  >();
  const started = Date.now();
  const user = await dbs.users.findOne({ id: userId });
  if (!user) {
    throw new Error(`User with id ${userId} not found`);
  }

  const { enqueueAgentExecution } = createQueue();

  const agentConfigsWithDefaults: Record<
    string,
    Awaited<ReturnType<typeof getAgentConfigWithDefaults>>
  > = {};
  for (const [agentName, config] of Object.entries(agentDefinitions ?? {})) {
    const configWithDefaults = await getAgentConfigWithDefaults(
      { agentName, agentConfig: config, definition_override },
      dbs,
    );

    agentConfigsWithDefaults[agentName] = configWithDefaults;

    const { tools } = configWithDefaults;

    const toolsWithInfo =
      tools && (await getValidatedMcpServerToolsAllowed(dbs, tools));

    const agentHandler = (input: string, requestTimestamp: Date) => {
      const run = () => {
        return startAgent(
          input,
          {
            name: agentName,
            toolsWithInfo,
            configWithDefaults,
            autoApproveAllTools,
            requestTimestamp,
          },
          {
            dbs,
            chatId,
            connectionId,
            userId,
            signal,
            askLLM: dbsClientFunctions.askLLM.run,
            started,
            timeout: containerConfiguration.timeout,
            messageId: message_id,
          },
        );
      };

      if (!runInSequence) {
        return run();
      }
      return enqueueAgentExecution(() => run());
    };
    agentHandlers.set(agentName, agentHandler);
  }

  const orchestrationToolsWithInfo =
    orchestrationTools &&
    (await getValidatedMcpServerToolsAllowed(dbs, orchestrationTools));

  return {
    agentHandlers,
    agentConfigsWithDefaults,
    orchestrationToolsWithInfo,
    orchestratorChat:
      mode !== "full" ? undefined : (
        await setupOrchestrationToolPermissions({
          orchestrationToolsWithInfo,
          dbs,
          chatId,
          userId,
          connectionId,
          databaseAccessDefinitions,
          autoApproveAllTools,
          messageId: message_id,
        })
      ),
  };
};
