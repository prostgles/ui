import { mdiClose, mdiFileOutline } from "@mdi/js";
import React from "react";
import Btn from "../Btn";
import Chip from "../Chip";
import type { Media } from "./FileInput";

export const FileInputMedia = (props: {
  file: Media;
  i: string;
  onDelete?: () => void;
  onClick?: () => void;
  style?: React.CSSProperties;
  focused?: boolean;
  minSize?: number;
}) => {
  const { file: f, i, onDelete, style = {}, onClick, focused } = props;

  const file: {
    type: string;
    name?: string;
    url: string;
    isLocalFile?: boolean;
  } =
    "url" in f ?
      { ...f, type: f.content_type }
    : {
        name: f.name,
        type: f.data.type,
        url: URL.createObjectURL(f.data),
        isLocalFile: true,
      };

  const { type, url, name } = file;
  let mediaPreview: React.ReactNode = null;
  const isVideo = type.startsWith("video");
  const isImageOrVideo = type.startsWith("image") || isVideo;
  if (url) {
    const style = {
      maxWidth: "100%",
      maxHeight: "100%",
    };
    if (type.startsWith("image")) {
      mediaPreview = <img loading="lazy" src={url} style={style}></img>;
    } else if (type.startsWith("video")) {
      mediaPreview = <video style={style} controls src={url}></video>;
    } else if (type.startsWith("audio")) {
      mediaPreview = <audio style={style} controls src={url}></audio>;
    } else {
      return (
        <Chip
          key={i}
          value={file.isLocalFile ? file.name : url}
          leftIcon={{ path: mdiFileOutline }}
          onDelete={onDelete}
        />
      );
    }
  }

  return (
    <div
      key={i}
      className={"FileInputMedia relative flex-col o-hidden md-auto"}
      style={{
        // width: `${minSize}px`,
        // height: `${minSize}px`,
        ...style,
      }}
    >
      <div
        className={
          (isVideo ? "bg-black " : "bg-color-0") +
          " relative flex-col f-0 w-fit "
        }
        style={{
          // ...(focused ?
          //   {}
          // : {
          //     maxWidth: `${minSize}px`,
          //     maxHeight: `${minSize}px`,
          //   }),
          minWidth: "100px",
          minHeight: "100px",
          ...style,
        }}
      >
        {!onClick ? null : (
          <div
            className={
              (isImageOrVideo ? "" : " media-onclick-cover  ") +
              " absolute w-full h-full pointer"
            }
            style={{ zIndex: 2 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClick();
            }}
          ></div>
        )}

        {!onDelete ? null : (
          <Btn
            className={"shadow  b b-color"}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 2,
              color: "black",
              backdropFilter: `blur(5px)`,
              backgroundColor: "white",
            }}
            size="small"
            iconPath={mdiClose}
            title="Remove file"
            onClick={() => {
              onDelete();
            }}
          />
        )}
        <div className={"f-1 min-w-0 min-h-0 flex-row ai-center"}>
          {mediaPreview}
        </div>

        {focused ?
          null
        : !name ?
          <a href={url} target="_blank" className="p-5 f-0" rel="noreferrer">
            {url}
          </a>
        : <div
            className="f-0 noselect p-p5 text-1p5 font-14 absolute w-full f-0"
            style={{
              position: isImageOrVideo ? "absolute" : "relative",
              zIndex: 1,
              bottom: 0,
              color: isImageOrVideo ? "white" : "black",
              background:
                isImageOrVideo ?
                  "linear-gradient(to bottom, rgb(255 255 255 / 0%) 0%,#00000075 70%)"
                : "white",
            }}
          >
            {name}
          </div>
        }
      </div>
    </div>
  );
};
