import type { DBSSchema } from "@common/publishUtils";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import type { SQLHandler } from "prostgles-client";
import React from "react";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import {
  ToolUseChatMessage,
  type LLMMessageContent,
} from "../ToolUseChatMessage/ToolUseChatMessage";
import { LLMChatMessageContentText } from "./LLMChatMessageContentText";

export const LLMChatMessageContent = ({
  messageContent,
  messageContentIndex,
  message,
  nextMessage,
  loadedSuggestions,
  mcpServerIcons,
  workspaceId,
  sql,
}: {
  messageContent: Exclude<LLMMessageContent, { type: "tool_result" }>;
  messageContentIndex: number;
  message: DBSSchema["llm_messages"];
  nextMessage: DBSSchema["llm_messages"] | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
  sql: SQLHandler | undefined;
  workspaceId: string | undefined;
  mcpServerIcons: Map<string, string>;
}) => {
  const sqlHandler = sql;
  if (messageContent.type === "text" && "text" in messageContent) {
    return (
      <LLMChatMessageContentText
        messageContent={messageContent}
        sqlHandler={sql}
        loadedSuggestions={loadedSuggestions}
      />
    );
  }
  if (messageContent.type !== "tool_use") {
    return (
      <MediaViewer
        url={messageContent.source.data}
        style={{
          maxHeight: "200px",
          maxWidth: "fit-content",
        }}
      />
    );
  }

  return (
    <ToolUseChatMessage
      message={message}
      nextMessage={nextMessage}
      toolUseMessageContentIndex={messageContentIndex}
      sqlHandler={sqlHandler}
      loadedSuggestions={loadedSuggestions}
      workspaceId={workspaceId}
      mcpServerIcons={mcpServerIcons}
    />
  );
};
