import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchemaForInsert } from "@common/publishUtils";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { FooterButtons } from "@components/Popup/FooterButtons";
import { mdiCheck, mdiCheckAll } from "@mdi/js";
import React, { useCallback, useMemo, useState } from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { tout } from "src/utils/utils";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { McpToolAccess } from "./AgenticWorkflow/McpToolAccess";
import { useJSONBParsedData } from "./common/useJSONBParsedData";
import { useSendToolUseResult } from "./common/useSendToolUseResult";
import { useTypedToolUseResultDataV2 } from "./common/useTypedToolUseResultData";

export const RequestToolAccess = ({
  message,
  toolUseResult: toolResult,
  chatId,
}: ProstglesMCPToolsProps) => {
  const { dbs, dbsMethods } = usePrglCore();
  const [configs, setConfigs] = useState<
    Partial<
      Record<
        string,
        {
          configId: number;
        }
      >
    >
  >({});
  const input = useJSONBParsedData(
    message.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["request_tool_access"][
      "schema"
    ],
  );
  const result = useTypedToolUseResultDataV2(
    toolResult?.toolUseResultMessage,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["request_tool_access"][
      "outputSchema"
    ],
  );

  const compactDatabaseAccess = input.data?.databaseAccess;
  const dbAccess = useMemo(
    () =>
      typeof compactDatabaseAccess === "string" ?
        {
          mode: compactDatabaseAccess,
        }
      : compactDatabaseAccess ?
        ({
          mode: "custom",
          tablePermissions: compactDatabaseAccess,
        } as const)
      : undefined,
    [compactDatabaseAccess],
  );

  const toolResultData = result?.data;

  const { sendToolUseResult } = useSendToolUseResult();
  const onAddTools = useCallback(
    async (
      accessInfo: NonNullable<typeof toolResultData>,
      state: "approved" | "auto_approve" | "deny",
    ) => {
      const onSendResult = () =>
        sendToolUseResult({
          chatId,
          toolName: message.name,
          toolUseId: message.id,
          type: "tool-use-result-confirmation",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...accessInfo,
                status: state === "deny" ? "denied" : "approved",
              } satisfies typeof accessInfo),
            },
          ],
        });

      if (state === "deny") {
        return await onSendResult();
      }

      if (accessInfo.validatedTools.length) {
        const serverNames = new Set(
          accessInfo.validatedTools.map((t) => t.server_name),
        );
        await dbs.mcp_servers.update(
          {
            name: {
              $in: accessInfo.validatedTools.map((t) => t.server_name),
            },
          },
          {
            enabled: true,
          },
        );

        /** TODO: listen for actual reload finish */
        await tout(2000);

        for (const serverName of serverNames) {
          await dbsMethods.reloadMcpServerTools?.({ serverName });
        }
        await dbs.llm_chats_allowed_mcp_tools.insertMany(
          accessInfo.validatedTools.map(
            ({ id, server_name }) =>
              ({
                chat_id: chatId,
                server_name,
                tool_id: id,
                auto_approve: state === "auto_approve",
                server_config_id: configs[server_name]?.configId,
              }) satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"],
          ),
          {
            onConflict: "DoUpdate",
          },
        );
      }
      if (dbAccess) {
        await dbs.llm_chats.update(
          { id: chatId },
          {
            db_data_permissions: dbAccess,
          },
        );
      }
      await tout(500);
      void onSendResult();
    },
    [
      chatId,
      dbAccess,
      dbs.llm_chats,
      dbs.llm_chats_allowed_mcp_tools,
      dbs.mcp_servers,
      dbsMethods,
      message.id,
      message.name,
      sendToolUseResult,
      configs,
    ],
  );
  const { mcpServerTools } = input.data ?? {};
  const { status } = toolResultData ?? {};
  return (
    <FlexCol
      data-command="RequestToolAccess"
      className="rounded b b-color shadow"
    >
      <FlexCol className="p-1">
        <div className="font-medium text-lg">
          {status === "approved" ?
            "Added tool access"
          : status === "denied" ?
            "Denied tool access"
          : "Requesting tool access"}
        </div>
        {!status && (
          <div className="text-gray-700 mb-2">
            The assistant is requesting access to{" "}
            {mcpServerTools ?
              <strong>mcp tools</strong>
            : null}
            {mcpServerTools && dbAccess ? " and " : " "}
            {dbAccess ?
              <strong>database</strong>
            : null}
            . Please review the request and grant or deny access.
          </div>
        )}
        {dbAccess && (
          <DatabaseAccessEditor
            newTables={[]}
            onChange={undefined}
            value={dbAccess}
          />
        )}

        {input.data?.reason && (
          <FlexRow>
            <strong>Reason:</strong>&nbsp;{input.data.reason}
          </FlexRow>
        )}

        {input.data?.mcpServerTools && (
          <McpToolAccess
            title="Mcp tools"
            value={input.data.mcpServerTools}
            configs={configs}
            onConfigChange={(serverName, configId) =>
              setConfigs((prev) => ({
                ...prev,
                [serverName]: { configId },
              }))
            }
          />
        )}

        <ErrorComponent
          error={
            toolResult?.toolUseResultMessage.is_error ?
              toolResult.toolUseResultMessage.content
            : (result?.error ?? input.error)
          }
        />
      </FlexCol>
      {toolResultData && input.data && !status && (
        <FooterButtons
          footerButtons={[
            {
              label: "Deny",
              onClickPromise: () => onAddTools(toolResultData, "deny"),
            },
            {
              label: "Add tools",
              title: "Add tools to chat",
              color: "action",
              variant: "filled",
              "data-command": "RequestToolAccess.Approve",
              iconPath: mdiCheck,
              onClickPromise: () => onAddTools(toolResultData, "approved"),
            },
            {
              label: "Add and auto-approve",
              title: "Add tools to chat and auto-approve",
              color: "action",
              variant: "filled",
              iconPath: mdiCheckAll,
              "data-command": "RequestToolAccess.AutoApprove",
              onClickPromise: () => onAddTools(toolResultData, "auto_approve"),
            },
          ]}
        />
      )}
    </FlexCol>
  );
};
