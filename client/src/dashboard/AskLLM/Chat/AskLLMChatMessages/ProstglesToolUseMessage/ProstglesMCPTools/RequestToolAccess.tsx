import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchemaForInsert } from "@common/publishUtils";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { FooterButtons } from "@components/Popup/FooterButtons";
import React, { useCallback } from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { McpToolAccess } from "./AgenticWorkflow/McpToolAccess";
import { useJSONBParsedData } from "./common/useJSONBParsedData";
import { useTypedToolUseResultDataV2 } from "./common/useTypedToolUseResultData";
import { mdiCheck, mdiCheckAll } from "@mdi/js";
import { useSendToolUseResult } from "./common/useSendToolUseResult";

export const RequestToolAccess = ({
  message,
  toolUseResult: toolResult,
  chatId,
}: ProstglesMCPToolsProps) => {
  const { dbs } = usePrglCore();
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
  const dbAccess = input.data?.databaseAccess;
  const toolResultData = result?.data;

  const { sendToolUseResult } = useSendToolUseResult();
  const onAddTools = useCallback(
    async (
      accessInfo: NonNullable<typeof toolResultData>,
      auto_approve = false,
    ) => {
      if (accessInfo.validatedTools.length) {
        await dbs.llm_chats_allowed_mcp_tools.insert(
          accessInfo.validatedTools.map(
            ({ id, server_name }) =>
              ({
                chat_id: chatId,
                server_name,
                tool_id: id,
                auto_approve,
              }) satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"],
          ),
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
      }
      if (dbAccess) {
        await dbs.llm_chats.update(
          { id: chatId },
          { db_data_permissions: dbAccess },
        );
      }
      await sendToolUseResult({
        chatId,
        toolName: message.name,
        toolUseId: message.id,
        content: [
          {
            type: "text",
            text: "Tool access granted",
          },
        ],
      });
    },
    [
      chatId,
      dbAccess,
      dbs.llm_chats,
      dbs.llm_chats_allowed_mcp_tools,
      dbs.mcp_servers,
      message.id,
      message.name,
      sendToolUseResult,
    ],
  );

  return (
    <FlexCol
      data-command="RequestToolAccess"
      className="rounded b b-color shadow"
    >
      <FlexCol className="p-1">
        <div className="font-medium text-lg">Requesting tool access</div>
        <div className="text-gray-700 mb-2">
          The assistant is requesting access to mcp tools/database. Please
          review the request and grant or deny access.
        </div>
        {dbAccess && (
          <DatabaseAccessEditor
            newTables={[]}
            onChange={undefined}
            value={dbAccess}
          />
        )}

        {input.data?.mcpServerTools && (
          <McpToolAccess value={input.data.mcpServerTools} title="Mcp tools" />
        )}

        <ErrorComponent error={result?.error ?? input.error} />
      </FlexCol>
      {toolResultData && input.data && (
        <FooterButtons
          footerButtons={[
            {
              label: "Deny",
            },
            {
              label: "Add tools",
              title: "Add tools to chat",
              color: "action",
              variant: "filled",
              "data-command": "RequestToolAccess.Approve",
              iconPath: mdiCheck,
              onClickPromise: () => onAddTools(toolResultData),
            },
            {
              label: "Add and auto-approve",
              title: "Add tools to chat and auto-approve",
              color: "action",
              variant: "filled",
              iconPath: mdiCheckAll,
              "data-command": "RequestToolAccess.AutoApprove",
              onClickPromise: () => onAddTools(toolResultData, true),
            },
          ]}
        />
      )}
    </FlexCol>
  );
};
