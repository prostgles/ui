import type { DBSSchema } from "@common/publishUtils";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import type { LoadedSuggestions } from "src/dashboard/Dashboard/dashboardUtils";
import { LLMChatMessageContentText } from "./LLMChatMessageContentText";
import {
  ToolUseChatMessage,
  type LLMMessageContent,
} from "../ToolUseChatMessage/ToolUseChatMessage";

export const LLMChatMessageContent = ({
  messageContent,
  messageContentIndex,
  message,
  nextMessage,
  loadedSuggestions,
  db,
  mcpServerIcons,
  workspaceId,
}: {
  messageContent: Exclude<LLMMessageContent, { type: "tool_result" }>;
  messageContentIndex: number;
  message: DBSSchema["llm_messages"];
  nextMessage: DBSSchema["llm_messages"] | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
  db: DBHandlerClient;
  workspaceId: string | undefined;
  mcpServerIcons: Map<string, string>;
}) => {
  const sqlHandler = db.sql;
  if (messageContent.type === "text" && "text" in messageContent) {
    return (
      <LLMChatMessageContentText
        messageContent={messageContent}
        db={db}
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
          // border: "1px solid var(--b-color)",
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
