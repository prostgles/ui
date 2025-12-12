import { sliceText } from "@common/utils";
import { mdiChevronLeft } from "@mdi/js";
import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../Icon/Icon";
import Popup from "../Popup/Popup";
import {
  ContentTypes,
  RenderMedia,
  type UrlInfo,
  type ValidContentType,
} from "./RenderMedia";

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
  const [isFocused, setIsFocused] = useState(false);
  const [urlInfo, setUrlInfo] = useState<UrlInfo | undefined>(
    content_type && url ?
      {
        raw: url,
        validated: url,
        forDisplay: sliceText(url, 100),
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
        contentType = mimeFromData ?? mime?.split(";")[0]?.trim();
      }

      setUrlInfo({
        raw: url,
        validated: url,
        forDisplay: sliceText(url, 100),
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
        void setURL(url);
      } catch (e) {
        console.error("Could check media URL", e);
      }
    } else {
      void setURL(url);
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
          void setURL(url);
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
                {urlInfo.forDisplay}
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

export const fetchMimeFromURLHead = async (
  url: string,
): Promise<string | null> => {
  try {
    const resp = await fetch(
      url,
      // { method: "HEAD" } this approach is not suitable due to CORS issues on some servers
      {
        headers: {
          Range: "bytes=0-0",
        },
      },
    );
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
