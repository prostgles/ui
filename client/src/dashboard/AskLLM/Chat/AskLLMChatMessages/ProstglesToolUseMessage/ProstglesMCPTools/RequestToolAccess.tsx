import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBSSchemaForInsert } from "@common/publishUtils";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { FooterButtons } from "@components/Popup/FooterButtons";
import { mdiCheck, mdiCheckAll } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useEffect, useState } from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { tout } from "src/utils/utils";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import { McpToolAccess } from "./AgenticWorkflow/McpToolAccess";
import { useJSONBParsedData } from "./common/useJSONBParsedData";
import { useSendToolUseResult } from "./common/useSendToolUseResult";
import { useTypedToolUseResultDataV2 } from "./common/useTypedToolUseResultData";

export const RequestToolAccess = ({
  toolUseContent,
  resultContent,
  chatId,
}: ProstglesMCPToolsProps) => {
  const {  dbs, dbsMethods } = usePrgl();
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
    toolUseContent.input,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["request_tool_access"][
      "schema"
    ],
  );
  const result = useTypedToolUseResultDataV2(
    resultContent,
    PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]["request_tool_access"][
      "outputSchema"
    ],
  );

  const dbAccess = input.data?.databaseAccess;

  const toolResultData = result?.data;

  /**
   * For convenience, add latest configs to the configs state, so that if the user has already configured a server, it will be used automatically.
   */
  useEffect(() => {
    if (!toolResultData) return;
    setConfigs((prev) => {
      const newConfigs = { ...prev };
      for (const tool of toolResultData.validatedTools) {
        if (tool.config_id && !newConfigs[tool.server_name]) {
          newConfigs[tool.server_name] = { configId: tool.config_id };
        }
      }
      return newConfigs;
    });
  }, [toolResultData]);

  const { sendToolUseResult } = useSendToolUseResult();
  const onAddTools = useCallback(
    async (
      accessInfo: NonNullable<typeof toolResultData>,
      state: "approved" | "auto_approve" | "deny",
    ) => {
      const onSendResult = () =>
        sendToolUseResult({
          chatId,
          toolName: toolUseContent.name,
          toolUseId: toolUseContent.id,
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
        const enabledServers = await dbs.mcp_servers.update(
          {
            name: {
              $in: accessInfo.validatedTools.map((t) => t.server_name),
            },
          },
          {
            enabled: true,
          },
          {
            returning: { name: 1, command: 1, config_schema: 1 },
          },
        );

        /** TODO: listen for actual reload finish */
        await tout(2000);

        for (const serverName of serverNames) {
          await dbsMethods.reloadMcpServerTools?.({ serverName });
        }
        await dbs.llm_chats_allowed_mcp_tools.insertMany(
          accessInfo.validatedTools.map(({ id, server_name, config_id }) => {
            const server = enabledServers?.find((s) => s.name === server_name);
            if (!server) {
              throw new Error(
                `Server ${server_name} not found in enabled servers: ${JSON.stringify(
                  enabledServers,
                )}`,
              );
            }
            const server_config_id =
              configs[server_name]?.configId ?? config_id;
            if (
              (server.config_schema || server.command === "streamable-http") &&
              !server_config_id
            ) {
              throw new Error(
                `Server ${server_name} requires a config, but no config was provided. Please provide a config for this server.`,
              );
            }
            return {
              chat_id: chatId,
              server_name,
              tool_id: id,
              auto_approve: state === "auto_approve",
              server_config_id: configs[server_name]?.configId ?? config_id,
            } satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"];
          }),
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
      await onSendResult();
    },
    [
      chatId,
      dbAccess,
      dbs.llm_chats,
      dbs.llm_chats_allowed_mcp_tools,
      dbs.mcp_servers,
      dbsMethods,
      toolUseContent.id,
      toolUseContent.name,
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
          <div className="text-0p5">
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
        {input.data?.reason && (
          <div>
            <strong>Reason:</strong>&nbsp;{input.data.reason}
          </div>
        )}
        {dbAccess && (
          <DatabaseAccessEditor
            newTables={[]}
            onChange={undefined}
            value={dbAccess}
          />
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
            resultContent?.is_error ?
              resultContent.content
            : (result?.error ?? input.error)
          }
        />
      </FlexCol>
      {toolResultData && input.data && !status && (
        <FooterButtons
          footerButtons={[
            {
              label: "Deny",
              size: "small",
              onClickPromise: () => onAddTools(toolResultData, "deny"),
            },
            {
              label: "Add tools",
              title: "Add tools to chat",
              color: "action",
              variant: "filled",
              size: "small",
              "data-command": "RequestToolAccess.Approve",
              iconPath: mdiCheck,
              onClickPromise: () => onAddTools(toolResultData, "approved"),
            },
            {
              label: "Add and auto-approve",
              title: "Add tools to chat and auto-approve",
              color: "action",
              variant: "filled",
              size: "small",
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
