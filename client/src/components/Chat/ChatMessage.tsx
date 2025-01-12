import React from "react";
import type { ChatProps, Message } from "./Chat";
import { Icon } from "../Icon/Icon";
import { mdiFile } from "@mdi/js";
import { Marked } from "./Marked";

type ChatMessageProps = Pick<ChatProps, "markdownCodeHeader"> & {
  message: Message;
};
export const ChatMessage = ({
  message: m,
  markdownCodeHeader,
}: ChatMessageProps) => {
  const id = m.id;
  if (m.media) {
    if (typeof m.media.content_type !== "string") {
      console.error("Bad media content_type");
    } else if (m.media.content_type.includes("video")) {
      return (
        <div
          className={"message media " + (m.incoming ? "incoming" : "")}
          key={id}
        >
          <video
            controls
            style={{ maxHeight: "320px", height: "fit-content" }}
            controlsList="nodownload"
          >
            <source src={m.media.url} type={m.media.content_type} />
          </video>
        </div>
      );
    } else if (m.media.content_type.includes("audio")) {
      return (
        <div
          className={"message media " + (m.incoming ? "incoming" : "")}
          key={id}
          style={{ color: "white" }}
        >
          <audio controls controlsList="nodownload" src={m.media.url} />
        </div>
      );
    } else if (m.media.content_type.includes("image")) {
      return (
        <div
          className={"message media " + (m.incoming ? "incoming" : "")}
          key={id}
          style={{
            border:
              "1px solid " + (!m.incoming ? "rgb(5, 149, 252)" : "#cacaca"),
          }}
        >
          <img
            loading="lazy"
            style={{ maxHeight: "300px", maxWidth: "260px" }}
            src={m.media.url}
          />
        </div>
      );
    } else {
      return (
        <div
          className={
            "message flex-row ai-center" + (m.incoming ? "incoming" : "")
          }
          key={id}
          style={{
            border:
              "1px solid " + (!m.incoming ? "rgb(5, 149, 252)" : "#cacaca"),
          }}
        >
          <Icon path={mdiFile} size={0.5} className="f-0 mr-p5" />
          <a href={m.media.url} target="_blank" style={{ color: "inherit" }}>
            {m.media.name}
          </a>
        </div>
      );
    }
  }
  const content =
    m.markdown ?
      <Marked key={m.id} content={m.markdown} codeHeader={markdownCodeHeader} />
    : m.message;
  return (
    <div className={"message " + (m.incoming ? "incoming" : "")} key={id}>
      {content}
    </div>
  );
};
