import { mdiChevronLeft } from "@mdi/js";
import React from "react";
import RTComp from "../dashboard/RTComp";
import Popup from "./Popup/Popup";
import { Icon } from "./Icon/Icon";
import { FlexCol } from "./Flex";
import Chip from "./Chip";

export const ContentTypes = ["image", "video", "audio"] as const;
type ValidContentType = (typeof ContentTypes)[number];

type P = {
  url?: string;

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

type S = {
  isFocused: boolean;

  url?: {
    raw: string;
    validated: string;
    content_type?: string; // If undefined then show as URL
    type?: ValidContentType;
  };
};

export class MediaViewer extends RTComp<P, S> {
  state: S = {
    isFocused: false,
    url: undefined,
  };

  static getMimeFromURL(
    url: string,
  ): (typeof ContentTypes)[number] | undefined {
    if (url && typeof url === "string") {
      const images = {
        jpg: 1,
        jpeg: 1,
        png: 1,
        tiff: 1,
        gif: 1,
        svg: 1,
        ico: 1,
      };
      const audio = {
        mp3: 1,
        wav: 1,
      };
      const video = {
        mp4: 1,
        avi: 1,
        ogg: 1,
        webm: 1,
        mov: 1,
      };
      const extension = url.split(".").slice(-1)[0]?.toLowerCase();
      if (!extension) return undefined;
      if (images[extension]) return "image";
      if (audio[extension]) return "audio";
      if (video[extension]) return "video";
    }
    return undefined;
  }

  rawURL?: string;

  onKeyDown = (e: KeyboardEvent) => {
    const { onPrevOrNext } = this.props;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onPrevOrNext?.(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPrevOrNext?.(-1);
    }
  };

  setURL = async (url: string) => {
    if (!url) return;

    const { content_type } = this.props;
    let contentType: string | undefined = content_type;
    if (!content_type) {
      const mime = await getMimeFromURL(url);
      contentType = mime?.split(";")?.[0]?.trim();
    }

    this.setState({
      url: {
        raw: url,
        validated: url,
        type: ContentTypes.find((ct) => contentType?.startsWith(ct)),
        content_type: contentType,
      },
    });
  };

  onDelta(dP) {
    const { url, allowedHostnames } = this.props;

    if (dP?.url && url && this.rawURL !== url) {
      this.rawURL = url;
      if (allowedHostnames) {
        try {
          const u = new URL(url);
          if (!allowedHostnames.includes(u.hostname)) {
            throw `Hostname ${u.hostname} is not allowed. Allowed hostnames: ${allowedHostnames}`;
          }
          this.setURL(url);
        } catch (e) {
          console.error("Could check media URL", e);
        }
      } else {
        this.setURL(url);
      }
    }
  }

  renderMedia = (contentOnly = false) => {
    if (!this.state.url) return null;

    const { isFocused } = this.state;
    const { validated: url, type = "", content_type } = this.state.url;
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
          ...(isFocused && contentOnly ? {} : this.props.style),
          ...(type === "audio" &&
            isFocused && {
              margin: "2em",
              border: "unset",
            }),
        },
        // className: "b b-color "
      } as const;
      if (type === "image") {
        mediaContent = <img loading="lazy" src={url} {...commonProps}></img>;
      } else if (type === "video") {
        mediaContent = (
          <video {...commonProps} controls src={url} preload="metadata"></video>
        );
      } else if (type === "audio") {
        mediaContent = <audio {...commonProps} controls src={url}></audio>;
      } else if (!isFocused && url) {
        mediaContent = (
          <FlexCol className="f-0 p-p5 gap-p25">
            {/* <a href={url} target="_blank" className="f-0">{url}</a>  */}
            <Chip value={content_type ?? "Not found"} />
          </FlexCol>
        );
      }
    }

    if (!contentOnly) {
      return (
        <div
          className="MediaViewer relative f-1 noselect flex-row min-h-0"
          style={this.props.style}
        >
          {mediaContent}
          <div
            className={"absolute w-full h-full pointer"}
            style={{ zIndex: 1, inset: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              this.setState({ isFocused: true });
            }}
          ></div>
        </div>
      );
    }
    return mediaContent;
  };

  render() {
    const { url, isFocused } = this.state;
    const { onPrevOrNext } = this.props;

    if (isFocused) {
      const toggleClick =
        !onPrevOrNext ? undefined : (
          (increment: 1 | -1) => {
            const { url } = onPrevOrNext(increment);
            if (url) {
              this.setURL(url);
            }
          }
        );
      return (
        <>
          {this.renderMedia()}
          <Popup
            rootStyle={{ padding: 0, borderRadius: 0 }}
            clickCatchStyle={{ opacity: 0.2 }}
            contentClassName="o-hidden"
            onClose={() => {
              this.setState({ isFocused: false });
            }}
            autoFocusFirst={"content"}
            focusTrap={true}
            title={
              !url ? "" : (
                <a
                  href={url.validated}
                  target="_blank"
                  className="p-1 f-0 text-1p5"
                  style={{ fontWeight: 400 }}
                >
                  {url.validated}
                </a>
              )
            }
            onKeyDown={!onPrevOrNext ? undefined : this.onKeyDown}
          >
            <div
              className={
                (
                  "MEDIAVIEWER relative flex-col f-1 o-auto noselect ai-center " +
                    url?.type ===
                  "image"
                ) ?
                  ""
                : " p-1"
              }
            >
              {toggleClick && ToggleBtn(true, () => toggleClick(-1))}
              {this.renderMedia(true)}
              {toggleClick && ToggleBtn(false, () => toggleClick(1))}
            </div>
          </Popup>
        </>
      );
    }

    return this.renderMedia();
  }
}

export const getMimeFromURL = async (url: string): Promise<string | null> => {
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
        size="34px"
      />
    </div>
  );
};
