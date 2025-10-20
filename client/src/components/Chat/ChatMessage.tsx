import React from "react";
import { FlexCol } from "../Flex";
import Loading from "../Loader/Loading";
import type { Message } from "./Chat";

type ChatMessageProps = {
  message: Message;
};
export const ChatMessage = ({ message: m }: ChatMessageProps) => {
  const { id, messageTopContent, isLoading } = m;

  return (
    <FlexCol
      className={
        "message gap-0 ai-start relative " + (m.incoming ? "incoming" : "")
      }
      key={id}
    >
      {isLoading ?
        <div
          className="content-wrapper"
          style={{ height: "80px", width: "80px" }}
        >
          <Loading className="m-1" sizePx={22} />
        </div>
      : <>
          {messageTopContent}
          <div className="content-wrapper" style={{ paddingRight: "2em" }}>
            {m.message}
          </div>
        </>
      }
    </FlexCol>
  );
};
