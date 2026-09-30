import React from "react";
import { FlexCol } from "../Flex";
import Loading from "../Loader/Loading";
import type { Message } from "./Chat";

type ChatMessageProps = {
  message: Message;
  isLast: boolean;
};
export const ChatMessage = ({ message: m, isLast }: ChatMessageProps) => {
  const { id, messageTopContent, isLoading } = m;

  return (
    <FlexCol
      className={
        "message gap-0 ai-start relative " + (m.incoming ? "incoming" : "")
      }
      key={id}
    >
      <>
        {messageTopContent}
        <div className="content-wrapper">{m.message}</div>
        {isLast && (
          <div
            className="content-wrapper"
            style={{
              height: "80px",
              width: "80px",
              visibility: isLoading ? "visible" : "hidden",
            }}
          >
            {isLoading && <Loading className="m-1" sizePx={22} />}
          </div>
        )}
      </>
    </FlexCol>
  );
};
