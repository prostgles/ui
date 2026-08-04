import type { ContentTypes } from "@common/columnDisplayFormat.schema";
import Btn from "@components/Btn";
import { getFileIconInfo } from "@components/FileTree/FileIcon";
import Popup from "@components/Popup/Popup";
import { mdiFileDocumentOutline } from "@mdi/js";
import React, { useState } from "react";
import { FlexCol } from "../Flex";
import type { MediaViewerProps } from "./MediaViewer";
import { PdfViewerWithFileTableContext } from "../PdfViewer/PdfViewerWithFileTableContext";

export type ValidContentType = (typeof ContentTypes)[number];
export type UrlInfo = {
  raw: string;
  validated: string;
  forDisplay: string;
  content_type?: string; // If undefined then show as URL
  type?: ValidContentType;
};

type P = Pick<MediaViewerProps, "context"> & {
  title: string | undefined;
  subTitle: string | undefined;
  contentOnly: boolean;
  urlInfo: UrlInfo | undefined;
  isFocused: boolean;
  style: React.CSSProperties | undefined;
  setIsFocused: (isFocused: boolean) => void;
  variant?: "thumbnail";
};

export const MediaViewerContent = ({
  contentOnly = false,
  isFocused,
  setIsFocused,
  urlInfo,
  style,
  title,
  subTitle,
  variant,
  context,
}: P) => {
  const [expandedDocUrl, setExpandedDocUrl] = useState<string>();
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
      const isPdf = content_type === "application/pdf";
      const fileIconInfo = getFileIconInfo(url, content_type);
      mediaContent = (
        <FlexCol className="f-0 gap-p25 max-w-full">
          <Btn
            variant="faded"
            iconProps={
              fileIconInfo?.color ?
                {
                  path: fileIconInfo.iconPath ?? mdiFileDocumentOutline,
                  color: fileIconInfo.color,
                }
              : undefined
            }
            size={variant === "thumbnail" ? "large" : undefined}
            value={content_type ?? "Not found"}
            title={content_type ?? url}
            className="max-w-full"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (
                content_type &&
                renderableContentTypes.includes(content_type)
              ) {
                setExpandedDocUrl(url);
              } else {
                setIsFocused(true);
              }
            }}
            children={
              variant === "thumbnail" ? undefined : (
                title ||
                (urlInfo.content_type ? content_type : (
                  urlInfo.forDisplay.slice(0, 100)
                ))
              )
            }
          />
          {content_type &&
            renderableContentTypes.includes(content_type) &&
            expandedDocUrl === url && (
              <Popup
                title={title ?? urlInfo.forDisplay}
                subTitle={subTitle}
                positioning="fullscreen"
                onClose={() => {
                  setExpandedDocUrl(undefined);
                }}
                contentClassName="p-0"
              >
                {isPdf ?
                  <PdfViewerWithFileTableContext url={url} context={context} />
                : <iframe
                    src={url}
                    style={{
                      minHeight: 0,
                      flex: 1,
                      width: "100%",
                      border: "none",
                    }}
                  ></iframe>
                }
              </Popup>
            )}
        </FlexCol>
      );
    }
  }

  if (!contentOnly) {
    const fullscreenTypes = ["video"];
    return (
      <div
        className={`MediaViewer relative f-1 noselect flex-row min-h-0 ai-start`}
        data-command="MediaViewer"
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
