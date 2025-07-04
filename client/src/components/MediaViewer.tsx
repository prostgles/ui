import { mdiChevronLeft } from "@mdi/js";
import React, { useCallback, useEffect } from "react";
import Chip from "./Chip";
import { FlexCol } from "./Flex";
import { Icon } from "./Icon/Icon";
import Popup from "./Popup/Popup";

export const ContentTypes = ["image", "video", "audio"] as const;
type ValidContentType = (typeof ContentTypes)[number];

type P = {
  url: string;

  /**
   * Request prev or next media
   */
  onPrevOrNext?: (increment: -1 | 1) => { url: string | undefined };

  style?: React.CSSProperties;

  /**
   * If present then check URL hostname before requesting
   */
  allowedHostnames?: string[];
  /**
   * If present then use this
   */
  content_type?: ValidContentType;
};

export const MediaViewer = (props: P) => {
  const { onPrevOrNext, style, content_type, url, allowedHostnames } = props;
  const [isFocused, setIsFocused] = React.useState(false);
  const [urlInfo, setUrlInfo] = React.useState<UrlInfo | undefined>(
    content_type && url ?
      {
        raw: url,
        validated: url,
        type: content_type,
        content_type,
      }
    : undefined,
  );

  const setURL = useCallback(
    async (url: string) => {
      if (!url) return;

      let contentType: string | undefined = content_type;
      if (!content_type) {
        const mimeFromData =
          url.startsWith("data:") ?
            url.split(":")[1]?.split(";")[0]
          : undefined;
        const mime = mimeFromData ?? (await fetchMimeFromURLHead(url));
        contentType = mimeFromData ?? mime?.split(";")?.[0]?.trim();
      }

      setUrlInfo({
        raw: url,
        validated: url,
        type: ContentTypes.find((ct) => contentType?.startsWith(ct)),
        content_type: contentType,
      });
    },
    [content_type],
  );

  useEffect(() => {
    if (!url) return;
    if (allowedHostnames) {
      try {
        const u = new URL(url);
        if (!allowedHostnames.includes(u.hostname)) {
          throw `Hostname ${u.hostname} is not allowed. Allowed hostnames: ${allowedHostnames}`;
        }
        setURL(url);
      } catch (e) {
        console.error("Could check media URL", e);
      }
    } else {
      setURL(url);
    }
  }, [allowedHostnames, setURL, url]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onPrevOrNext?.(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrevOrNext?.(-1);
      }
    },
    [onPrevOrNext],
  );

  const toggleClick =
    !onPrevOrNext ? undefined : (
      (increment: 1 | -1) => {
        const { url } = onPrevOrNext(increment);
        if (url) {
          setURL(url);
        }
      }
    );
  return (
    <>
      <RenderMedia
        isFocused={isFocused}
        setIsFocused={setIsFocused}
        style={style}
        urlInfo={urlInfo}
        contentOnly={false}
      />
      {isFocused && (
        <Popup
          rootStyle={{ padding: 0, borderRadius: 0 }}
          clickCatchStyle={{ opacity: 0.2 }}
          contentClassName="o-hidden"
          onClose={() => {
            setIsFocused(false);
          }}
          positioning="fullscreen"
          autoFocusFirst={"content"}
          focusTrap={true}
          title={
            !urlInfo ? "" : (
              <a
                href={urlInfo.validated}
                target="_blank"
                className="p-1 f-0 text-1p5"
                style={{ fontWeight: 400 }}
                rel="noreferrer"
              >
                {urlInfo.validated}
              </a>
            )
          }
          onKeyDown={!onPrevOrNext ? undefined : onKeyDown}
        >
          <div
            className={
              (
                "MEDIAVIEWER relative flex-col f-1 o-auto noselect ai-center " +
                  urlInfo?.type ===
                "image"
              ) ?
                ""
              : " p-1 f-1 w-full h-full flex-col"
            }
          >
            {toggleClick && ToggleBtn(true, () => toggleClick(-1))}
            <RenderMedia
              isFocused={isFocused}
              setIsFocused={setIsFocused}
              style={style}
              urlInfo={urlInfo}
              contentOnly={true}
            />
            {toggleClick && ToggleBtn(false, () => toggleClick(1))}
          </div>
        </Popup>
      )}
    </>
  );
};
type UrlInfo = {
  raw: string;
  validated: string;
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
      },
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
      mediaContent = <audio {...commonProps} controls src={url}></audio>;
    } else if (!isFocused && url) {
      mediaContent = (
        <FlexCol className="f-0 p-p5 gap-p25">
          {content_type && renderableContentTypes.includes(content_type) ?
            <iframe
              src={url}
              style={{
                minHeight: 0,
              }}
            ></iframe>
          : <Chip value={content_type ?? "Not found"} />}
        </FlexCol>
      );
    }
  }

  if (!contentOnly) {
    const fullscreenTypes = ["video"];
    return (
      <div
        className="MediaViewer relative f-1 noselect flex-row min-h-0"
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

export const fetchMimeFromURLHead = async (
  url: string,
): Promise<string | null> => {
  try {
    const resp = await fetch(url, { method: "HEAD" });
    if (resp.status >= 400) return null;
    return resp.headers.get("Content-Type");
  } catch (e) {
    console.error(e);
    return null;
  }
};

const ToggleBtn = (isLeft: boolean, onClick: VoidFunction) => {
  return (
    <div
      className="h-full w-fit absolute text-white flex-row ai-center px-1 pointer"
      onClick={onClick}
      style={{
        top: 0,
        bottom: 0,
        ...(isLeft ? { left: 0 } : { right: 0 }),
        zIndex: 2,
        color: "white",
        background: `linear-gradient(to ${isLeft ? "right" : "left"}, black, transparent)`,
      }}
    >
      <Icon
        path={mdiChevronLeft}
        style={{
          color: "white",
          transform: isLeft ? undefined : "rotate(180deg)",
        }}
        sizePx={34}
      />
    </div>
  );
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
