import React from "react";
import type { ChatProps, Message } from "./Chat";
import { Icon } from "../Icon/Icon";
import { mdiFile } from "@mdi/js";
import { Marked } from "./Marked";
import { FlexCol } from "../Flex";
import ErrorComponent from "../ErrorComponent";
import Loading from "../Loading";

type ChatMessageProps = Pick<ChatProps, "markdownCodeHeader"> & {
  message: Message;
};
export const ChatMessage = ({
  message: m,
  markdownCodeHeader,
}: ChatMessageProps) => {
  const { id, messageTopContent, isLoading } = m;
  if (m.media) {
    const { content_type } = m.media;
    const mediaType =
      content_type.includes("video") ? "video"
      : content_type.includes("audio") ? "audio"
      : content_type.includes("image") ? "image"
      : "file";
    return (
      <div
        className={"message media " + (m.incoming ? "incoming" : "")}
        key={id}
        style={
          mediaType === "video" ? {}
          : mediaType === "audio" ?
            { color: "white" }
          : {
              border:
                "1px solid " + (!m.incoming ? "rgb(5, 149, 252)" : "#cacaca"),
            }

        }
      >
        {typeof m.media.content_type !== "string" ?
          <ErrorComponent error={"Bad media content_type"} />
        : content_type.includes("video") ?
          <video
            controls
            style={{ maxHeight: "320px", height: "fit-content" }}
            controlsList="nodownload"
          >
            <source src={m.media.url} type={m.media.content_type} />
          </video>
        : content_type.includes("audio") ?
          <audio controls controlsList="nodownload" src={m.media.url} />
        : content_type.includes("image") ?
          <img
            loading="lazy"
            style={{ maxHeight: "300px", maxWidth: "260px" }}
            src={m.media.url}
          />
        : <>
            <Icon path={mdiFile} size={0.5} className="f-0 mr-p5" />
            <a
              href={m.media.url}
              target="_blank"
              style={{ color: "inherit" }}
              rel="noreferrer"
            >
              {m.media.name}
            </a>
          </>
        }
      </div>
    );
  }
  const content =
    m.markdown ?
      <Marked key={m.id} content={m.markdown} codeHeader={markdownCodeHeader} />
    : m.message;
  return (
    <FlexCol
      className={"message gap-0 ai-start " + (m.incoming ? "incoming" : "")}
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
          <div className="content-wrapper">{content}</div>
        </>
      }
    </FlexCol>
  );
};
