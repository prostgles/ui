import { mdiFileDocumentOutline } from "@mdi/js";
import React, { useState } from "react";
import Chip from "../Chip";
import { FlexCol } from "../Flex";

export const ContentTypes = ["image", "video", "audio"] as const;
export type ValidContentType = (typeof ContentTypes)[number];
export type UrlInfo = {
  raw: string;
  validated: string;
  forDisplay: string;
  content_type?: string; // If undefined then show as URL
  type?: ValidContentType;
};

export const RenderMedia = ({
  contentOnly = false,
  isFocused,
  setIsFocused,
  urlInfo,
  style,
}: {
  contentOnly: boolean;
  urlInfo: UrlInfo | undefined;
  isFocused: boolean;
  style: React.CSSProperties | undefined;
  setIsFocused: (isFocused: boolean) => void;
}) => {
  if (!urlInfo) return null;

  const { validated: url, type = "", content_type } = urlInfo;
  let mediaContent: React.ReactNode = null;
  if (url) {
    const commonProps = {
      style: {
        minHeight: 0,
        flex:
          type === "audio" ? "none"
          : type === "image" ? undefined
          : 1,
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        ...(isFocused && contentOnly ? {} : style),
        ...(type === "audio" &&
          isFocused && {
            margin: "2em",
            border: "unset",
          }),
        ...(type === "audio" && {
          display: "block",
          objectFit: undefined,
          minHeight: undefined,
          maxWidth: "99vw",
          minWidth: "399px",
          height: "60px",
          width: "400px",
          border: "unset",
          flex: 1,
        }),
      } satisfies React.CSSProperties,
    } as const;
    if (type === "image") {
      mediaContent = (
        <img
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsFocused(!isFocused);
          }}
          className="pointer"
          loading="lazy"
          src={url}
          {...commonProps}
        />
      );
    } else if (type === "video") {
      mediaContent = (
        <video {...commonProps} controls src={url} preload="metadata"></video>
      );
    } else if (type === "audio") {
      mediaContent = <audio {...commonProps} controls src={url} />;
    } else if (!isFocused && url) {
      mediaContent = (
        <FlexCol className="f-0 gap-p25">
          {content_type && renderableContentTypes.includes(content_type) ?
            <iframe
              src={url}
              style={{
                minHeight: 0,
              }}
            ></iframe>
          : <Chip
              leftIcon={{ path: mdiFileDocumentOutline }}
              value={content_type ?? "Not found"}
            />
          }
        </FlexCol>
      );
    }
  }

  if (!contentOnly) {
    const fullscreenTypes = ["video"];
    return (
      <div
        className={`MediaViewer relative f-1 noselect flex-row min-h-0`}
        style={style}
      >
        {mediaContent}
        {type !== "image" && fullscreenTypes.includes(type) && (
          <div
            className={"absolute w-full h-full pointer"}
            style={{ zIndex: 1, inset: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsFocused(true);
            }}
          />
        )}
      </div>
    );
  }
  return mediaContent;
};

const renderableContentTypes = [
  // PDF Documents
  "application/pdf",

  "text/plain",
  "application/json",
  "text/xml",
  "application/xml",
  "application/xhtml+xml",

  // Office Documents (with plugins or modern browsers)
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Rich Text
  "application/rtf",
  "text/rtf",

  // 3D Models (modern browsers)
  "model/gltf+json",
  "model/gltf-binary",

  // Markdown (some contexts)
  "text/markdown",
  "text/x-markdown",
];
