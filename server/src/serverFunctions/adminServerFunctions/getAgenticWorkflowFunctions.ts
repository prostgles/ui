import { validateUserInput } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/definitionValidation/validateUserInput";
import { getAgenticWorkflowFiles } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";
import {
  startAgenticWorkflow,
  stopAgenticWorkflow,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/startAgenticWorkflow";
import { pickKeys } from "prostgles-types";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { getDefineAdminFunction } from "./getDefineAdminFunction";
import { stopContainer } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/runCodeInSandboxContainer";
import { startAgenticWorkflowSchema } from "@common/startAgenticWorkflowSchema";
import {
  renderSummary,
  summariseWorkflowFile,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/getTsLogicSummary";
import { instrumentWorkflowFile } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/addInstrumentationToTsLogic";
import { join } from "node:path";
import { glob } from "glob";
import { getRootDir } from "@src/electronConfig";
import { readFile } from "node:fs/promises";

export const getAgenticWorkflowFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const { defineAdminFunction } = getDefineAdminFunction(context);

  return {
    startAgenticWorkflow: defineAdminFunction({
      input: pickKeys(startAgenticWorkflowSchema, [
        "chatId",
        "workflowId",
        "userInputValue",
        "messageId",
        "executionMode",
        "autoApproveAllTools",
      ]),
      run: async (
        {
          chatId,
          userInputValue,
          workflowId,
          messageId,
          executionMode,
          autoApproveAllTools,
        },
        { dbs, user, clientReq },
      ) => {
        const chat = await dbs.llm_chats.findOne({
          id: chatId,
          user_id: user.id,
        });
        if (!chat) {
          return {
            state: "init-error" as const,
            message: "Chat not found",
            error: undefined,
          };
        }
        const { connection_id } = chat;
        if (!connection_id) {
          return {
            state: "init-error" as const,
            message: `Chat with id ${chatId} does not have a connection_id`,
            error: undefined,
          };
        }

        const workflow = await dbs.agentic_workflows.findOne({
          id: workflowId,
          chat_id: chatId,
        });
        if (!workflow) {
          return {
            state: "init-error" as const,
            message: `Workflow with id ${workflowId} not found for chat ${chatId}`,
            error: undefined,
          };
        }
        const userInputValidation =
          workflow.definition_data.userInput &&
          validateUserInput(userInputValue, workflow.definition_data.userInput);
        if (userInputValidation?.isValid === false) {
          return {
            state: "init-error" as const,
            message: userInputValidation.error,
            error: undefined,
          };
        }
        return startAgenticWorkflow({
          workflow,
          dbs,
          user,
          connection_id,
          chat,
          messageId,
          clientReq,
          executionMode,
          userInputValue: userInputValidation?.value ?? {},
          autoApproveAllTools,
        });
      },
    }),
    stopAgenticWorkflow: defineAdminFunction({
      input: {
        chatId: "integer",
        messageId: "string",
      },
      run: async ({ chatId, messageId }, { user, dbs }) => {
        return stopAgenticWorkflow({
          dbs,
          chatId,
          messageId,
          userId: user.id,
        });
      },
    }),
    getAgenticWorkflowTypes: defineAdminFunction({
      input: {
        connectionId: "string",
        workflowId: { optional: true, type: "number" },
      },
      run: async ({ connectionId, workflowId }, { dbs, user }) => {
        const workflow =
          !workflowId ? undefined : (
            await dbs.agentic_workflows.findOne({
              id: workflowId,
              user_id: user.id,
            })
          );

        // TODO: merge this prostgles-types logic with getNodeTypes and move to a cached GET route
        const nodeModulesPath =
          getRootDir() + "/node_modules/prostgles-types/dist/";
        const pattern = join(nodeModulesPath, "**/*.d.ts");
        const prostglesTypesFiles = await glob(pattern, {
          signal: AbortSignal.timeout(5000),
          withFileTypes: true,
        });
        const prostglesTypesFilesObj: Record<string, string> = {};
        for (const file of prostglesTypesFiles) {
          const absolutePath = file.fullpath();
          const code = await readFile(absolutePath, "utf-8");

          const relativePath = absolutePath
            .slice(absolutePath.indexOf("/node_modules/"))
            .replace(
              "/node_modules/prostgles-types/dist/",
              "node_modules/prostgles-types/",
            );
          prostglesTypesFilesObj[relativePath] = code;
        }

        const files = await getAgenticWorkflowFiles(
          dbs,
          "runtime",
          connectionId,
          {
            type: "full",
            ddlStatements:
              (
                workflow?.definition_data.databaseAccessDefinitions?.mode ===
                "custom"
              ) ?
                workflow.definition_data.databaseAccessDefinitions.ddlStatements
              : undefined,
          },
        );
        const astInfo = summariseWorkflowFile(workflow?.definition ?? "");
        const summary = renderSummary(astInfo);
        const instrumentedFile = instrumentWorkflowFile(
          files["defineAgenticWorkflow.ts"],
        );
        return {
          files: { ...files, ...prostglesTypesFilesObj },
          astNodes: astInfo as any,
          summary,
          instrumentedFile,
        };
      },
    }),
    stopDockerContainer: defineAdminFunction({
      input: {
        chatId: "integer",
        toolUseId: "string",
      },
      run: async ({ chatId, toolUseId }, { dbs, user }) => {
        const container = await dbs.docker_containers.findOne({
          chat_id: chatId,
          user_id: user.id,
          tool_use_id: toolUseId,
        });
        if (!container) {
          throw new Error(
            `Container with tool use id ${toolUseId} not found for chat ${chatId}`,
          );
        }
        stopContainer(container.id);
        await dbs.docker_containers.update(
          {
            id: container.id,
          },
          {
            state: {
              status: "stopped",
            },
          },
        );
        return { success: true };
      },
    }),
  };
};
