import React, { useMemo, useState } from "react";

import { getMCPFullToolName } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import { Marked } from "@components/Chat/Marked";
import { FlexCol, FlexRow } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import { isEmpty } from "../../../utils/utils";
import { ProstglesMCPToolsWithUI } from "../Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesToolUseMessage";
import type { useAskLLMToolApprove } from "./useAskLLMToolApprover";
import { NavLink } from "react-router";
import { getConnectionPaths } from "@common/utils";
import { isDefined } from "@common/filterUtils";
import type { BtnProps } from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import Chip from "@components/Chip";

export type AskLLMToolsProps = {
  workspaceId: string | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
  onOpenChat: (selectedChatId: number) => void;
  openedChatId: number | undefined;
  connectionId: string;
} & ReturnType<typeof useAskLLMToolApprove>;

export const AskLLMToolApprover = (props: AskLLMToolsProps) => {
  const {
    loadedSuggestions,
    workspaceId,
    onOpenChat,
    openedChatId,
    dbSchemaForPrompt,
    requests,
    respond,
    showRequestId,
    setShowRequestId,
    connectionId,
  } = props;

  const [ignoredRequestIds, setIgnoredRequestIds] = useState<number[]>([]);
  const nonIgnoredRequests = useMemo(
    () => requests?.filter((r) => !ignoredRequestIds.includes(r.id)),
    [requests, ignoredRequestIds],
  );
  const requestItem =
    showRequestId ?
      requests?.find(({ id }) => id === showRequestId)
    : nonIgnoredRequests?.[0];

  const toolUse = useMemo(() => {
    if (!requestItem) return;
    const { input, tool_use_id, source, llm_messages } = requestItem;
    const toolUseMessage = llm_messages[0];
    if (source.type === "proxy") {
      return { state: "ok", input } as const;
    }
    if (!toolUseMessage) {
      return { state: "error" } as const;
    }
    const inputFromMessage = toolUseMessage.message
      .map((content) =>
        content.type === "tool_use" && content.id === tool_use_id ?
          content
        : undefined,
      )
      .find(isDefined)?.input;

    return {
      state: "ok",
      input: inputFromMessage,
    } as const;
  }, [requestItem]);
  if (!requestItem || (openedChatId !== undefined && !showRequestId)) {
    return null;
  }

  const {
    chat_id,
    server_name,
    tool_name,
    input,
    tool_use_id,
    mcp_server_tools,
    source,
  } = requestItem;
  const { annotations } = mcp_server_tools[0] ?? {};
  const connections = requestItem.connections as
    | Pick<DBSSchema["connections"], "id" | "name">[]
    | undefined;
  const description =
    requestItem.mcp_server_tools[0]?.description ??
    "Could not find tool description";
  const name = getMCPFullToolName(server_name, tool_name);
  const ToolUI = ProstglesMCPToolsWithUI[name];
  const differentConnection =
    requestItem.connection_id !== connectionId ?
      connections?.find((c) => c.id === requestItem.connection_id)
    : undefined;

  const btnDestructiveToolHint: Pick<BtnProps, "title" | "color"> =
    annotations?.readOnlyHint === false ?
      {
        title:
          "Not read-only hint: This tool may perform actions that can modify data.",
        color: "warn",
      }
    : annotations?.destructiveHint ?
      {
        title:
          "Destructive hint: This tool may perform actions that can modify or delete data.",
        color: "danger",
      }
    : {
        color: "action",
        title: undefined,
      };

  if (toolUse?.state === "error" || !toolUse?.input) {
    return (
      <ErrorComponent error="Tool use message not found for this request" />
    );
  }

  return (
    <Popup
      title={
        <FlexRow>
          <div>Allow tool from {server_name} to run?</div>
          {differentConnection && (
            <NavLink to={getConnectionPaths(differentConnection).dashboard}>
              {differentConnection.name}
            </NavLink>
          )}
        </FlexRow>
      }
      showFullscreenToggle={{}}
      onClose={() => {
        setIgnoredRequestIds((prev) => [...prev, requestItem.id]);
        if (showRequestId) {
          setShowRequestId(undefined);
        }
      }}
      clickCatchStyle={{ opacity: 1 }}
      contentStyle={{
        maxWidth: "min(800px, 100vw)",
        width: "100%",
      }}
      contentClassName="p-1 f-1 as-center"
      footerButtons={[
        {
          label: "Deny",
          color: "danger",
          variant: "faded",
          "data-command": "AskLLMToolApprover.Deny",
          onClickPromise: async () => {
            await respond({
              id: requestItem.id,
              response: "deny",
              schema: dbSchemaForPrompt,
            });
          },
        },
        differentConnection || requestItem.source.type === "proxy" ?
          {
            className: "ml-auto",
            label: "Show chat",
            color: "action",
            variant: "faded",
            "data-command": "AskLLMToolApprover.ShowChat",
            onClick: () => {
              onOpenChat(chat_id);
            },
          }
        : undefined,
        {
          label: "Allow once",
          variant: "filled",
          ...btnDestructiveToolHint,
          "data-command": "AskLLMToolApprover.AllowOnce",
          onClickPromise: async () => {
            await respond({
              id: requestItem.id,
              response: "approve",
              schema: dbSchemaForPrompt,
            });
          },
        },
        {
          label: "Allow always",
          variant: "filled",
          ...btnDestructiveToolHint,
          "data-command": "AskLLMToolApprover.AllowAlways",
          onClickPromise: async () => {
            await respond({
              id: requestItem.id,
              response: "auto-approve",
              schema: dbSchemaForPrompt,
            });
          },
        },
      ]}
    >
      <FlexCol className="f-1">
        <FlexRow>
          Run <strong>{tool_name}</strong>
          <FlexRow>
            from <strong>{server_name}</strong>
          </FlexRow>
          {source.type === "proxy" && (
            <Chip color="blue">Requested from container</Chip>
          )}
        </FlexRow>
        <Marked
          style={{ maxHeight: "200px" }}
          className="ta-start"
          content={description}
          codeHeader={undefined}
          loadedSuggestions={undefined}
          sqlHandler={undefined}
          prgl={undefined}
        />
        {!isEmpty(input) && (
          <>
            {ToolUI ?
              <ToolUI.component
                chatId={chat_id}
                toolUseContent={{
                  type: "tool_use",
                  id: tool_use_id,
                  name,
                  input: toolUse.input,
                }}
                resultContent={undefined}
                workspaceId={workspaceId}
                loadedSuggestions={loadedSuggestions}
                isShownInToolUseRequest={true}
              />
            : <CodeEditorWithSaveButton
                label="Input"
                value={JSON.stringify(input, null, 2)}
                language="json"
              />
            }
          </>
        )}
      </FlexCol>
    </Popup>
  );
};
