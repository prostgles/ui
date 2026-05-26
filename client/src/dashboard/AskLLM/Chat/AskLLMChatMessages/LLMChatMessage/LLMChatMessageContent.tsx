import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import PopupMenu from "@components/PopupMenu";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiFileDocument } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
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
  workspaceId,
}: {
  messageContent: Exclude<LLMMessageContent, { type: "tool_result" }>;
  messageContentIndex: number;
  message: DBSSchema["llm_messages"];
  nextMessage: DBSSchema["llm_messages"] | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
  workspaceId: string | undefined;
}) => {
  const prgl = usePrgl();
  const { sql: sqlHandler } = prgl;
  if (messageContent.type === "text-document") {
    return (
      <PopupMenu
        title={messageContent.fileName}
        positioning="fullscreen"
        button={
          <Btn
            data-command="LLMChatMessageContent.textDocument"
            variant="faded"
            iconPath={mdiFileDocument}
          >
            {messageContent.fileName}
          </Btn>
        }
      >
        <ScrollFade
          style={{
            overflow: "auto",
          }}
        >
          <Marked
            codeHeader={undefined}
            content={messageContent.text}
            sqlHandler={sqlHandler}
            loadedSuggestions={loadedSuggestions}
            prgl={prgl}
          />
        </ScrollFade>
      </PopupMenu>
    );
  }
  if (messageContent.type === "text" && "text" in messageContent) {
    return (
      <LLMChatMessageContentText
        messageContent={messageContent}
        sqlHandler={sqlHandler}
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
    />
  );
};
