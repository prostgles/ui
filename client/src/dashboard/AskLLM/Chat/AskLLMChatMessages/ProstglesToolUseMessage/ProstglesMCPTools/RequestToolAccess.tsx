import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchemaForInsert } from "@common/publishUtils";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { FooterButtons } from "@components/Popup/FooterButtons";
import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { useJSONBParsedData } from "./common/useJSONBParsedData";
import { useTypedToolUseResultData } from "./common/useTypedToolUseResultData";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { McpToolAccess } from "./AgenticWorkflow/McpToolAccess";

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
  const result = useTypedToolUseResultData(
    toolResult?.toolUseResultMessage,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["request_tool_access"][
      "outputSchema"
    ],
  );
  const dbAccess = input.data?.databaseAccess;
  return (
    <FlexCol
      data-command="RequestToolAccess"
      className="rounded b b-color-1 shadow p-1"
    >
      <div className="font-medium text-lg mb-2">Requesting tool access</div>
      <div className="text-sm text-gray-700">
        The assistant is requesting access to a tool. Please review the request
        and grant access if you trust the assistant.
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

      <ErrorComponent error={input.error} />
      {result && input.data && (
        <FooterButtons
          footerButtons={[
            {
              label: "Deny",
            },
            {
              label: "Add tools to chat",
              color: "action",
              variant: "filled",
              "data-command": "RequestToolAccess.Approve",
              onClickPromise: async () => {
                if (result.validatedTools.length) {
                  await dbs.llm_chats_allowed_mcp_tools.insert(
                    result.validatedTools.map(
                      ({ id, server_name }) =>
                        ({
                          chat_id: chatId,
                          server_name,
                          tool_id: id,
                        }) satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"],
                    ),
                  );
                }
                if (dbAccess) {
                  await dbs.llm_chats.update(
                    { id: chatId },
                    { db_data_permissions: dbAccess },
                  );
                }
              },
            },
          ]}
        />
      )}
    </FlexCol>
  );
};
