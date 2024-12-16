import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiClose,
  mdiFileOutline,
  mdiPlus,
} from "@mdi/js";
import React from "react";
import type { Command } from "../../Testing";
import RTComp from "../../dashboard/RTComp";
import Btn from "../Btn";
import Chip from "../Chip";
import { FlexCol, classOverride } from "../Flex";
import Popup from "../Popup/Popup";
import { DropZone } from "./DropZone";
import { Icon } from "../Icon/Icon";

export type SavedMedia = {
  id: string;
  name?: string;
  content_type: string;
  url: string;
};

export type LocalMedia = {
  name: string;
  data: File;
};

export type Media = SavedMedia | LocalMedia;

export const generateUniqueID = (prefix = "generated") => {
  let result = "generated1";
  do {
    result = `${prefix}${Math.round(Math.random() * 1e14)}`;
  } while (document.querySelector("#" + result));
  return result;
};

type S = {
  focusedFile?: {
    index: number;
    file: Media;
  };
  id?: string;
  isOverflowing?: boolean;
};
export default class FileInput extends RTComp<
  {
    id?: string;
    className?: string;
    style?: React.CSSProperties;

    media?: Media[];
    /**
     * Minimum size in px a media item can be resized to fit screen space
     * Defaults to 150px
     */
    minSize?: number;

    onAdd?: (media: LocalMedia[]) => void;
    onDelete?: (media: Media) => void;

    label?: string;

    accept?: string;
    maxFileCount?: number;

    showDropZone?: boolean;
  },
  S
> {
  ref?: any;
  state: S = {
    focusedFile: undefined,
    isOverflowing: false,
  };

  onMount(): void {
    this.setState({
      id: generateUniqueID(),
    });
  }

  resizeObserver?: ResizeObserver;

  onDelta = () => {
    /**
     * If isViewerMode then add left right buttons if media items overlow refWrapper
     */
    const isViewerMode = this.isViewerMode();
    if (isViewerMode) {
      if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver((entries) => {
          const isOverflowing =
            this.refWrapper!.scrollWidth > this.refWrapper!.offsetWidth;
          if (this.state.isOverflowing !== isOverflowing) {
            this.setState({ isOverflowing });
          }
        });

        this.resizeObserver.observe(this.refWrapper!);
      }
    } else if (this.resizeObserver) {
      this.resizeObserver.unobserve(this.refWrapper!);
    }
  };

  renderMedia = (params: {
    file: Media;
    i: string;
    onDelete?: () => void;
    onClick?: () => void;
    style?: React.CSSProperties;
    focused?: boolean;
  }) => {
    const { file: f, i, onDelete, style = {}, onClick, focused } = params;

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
        // maxHeight: "100%",
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

    const { minSize = 150 } = this.props;

    return (
      <div
        key={i}
        className={" relative flex-col o-hidden md-auto"}
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
            ...(focused ?
              {}
            : {
                maxWidth: `${minSize}px`,
                maxHeight: `${minSize}px`,
              }),
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
              className={"shadow  b b-color-2"}
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
            <a href={url} target="_blank" className="p-5 f-0">
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

  isViewerMode = () => {
    const { onAdd, onDelete } = this.props;

    return Boolean(!onAdd && !onDelete);
  };

  refWrapper?: HTMLDivElement;
  render() {
    const {
      className = "",
      style = {},
      label,
      maxFileCount = 100,
      accept,
      id = this.state.id ?? "empty",
      onAdd,
      media = [],
      onDelete,
      minSize = 150,
      showDropZone = true,
    } = this.props;
    const { focusedFile, isOverflowing } = this.state;
    const isViewerMode = this.isViewerMode();
    let popup;
    if (focusedFile) {
      const contentType =
        "data" in focusedFile.file ?
          focusedFile.file.data.type
        : focusedFile.file.content_type;

      popup = (
        <Popup
          // anchorEl={this.ref}
          // positioning={"inside"}
          rootStyle={{ padding: 0 }}
          contentClassName=""
          onClose={() => {
            this.setState({ focusedFile: undefined });
          }}
          title={focusedFile.file.name}
          onKeyDown={
            !isViewerMode ? undefined : (
              (e) => {
                if (e.key === "ArrowRight") {
                  const index =
                    focusedFile.index < media.length - 1 ?
                      focusedFile.index + 1
                    : 0;
                  this.setState({
                    focusedFile: {
                      file: media[index]!,
                      index,
                    },
                  });
                } else if (e.key === "ArrowLeft") {
                  const index =
                    focusedFile.index ?
                      focusedFile.index - 1
                    : media.length - 1;
                  this.setState({
                    focusedFile: {
                      file: media[index]!,
                      index,
                    },
                  });
                }
              }
            )
          }
        >
          {this.renderMedia({
            file: focusedFile.file,
            i: "focused",
            style: {
              width: "fit-content",
              height: "fit-content",
              border: "unset",
            },
            onClick:
              !contentType.startsWith("image") ?
                undefined
              : () => {
                  this.setState({ focusedFile: undefined });
                },
            focused: true,
          })}
        </Popup>
      );
    }

    const setFiles = (files: FileList | File[]) => {
      const newFiles: LocalMedia[] = Array.from(files).map((file) => ({
        data: file,
        // url: URL.createObjectURL(file),
        // content_type: file.type,
        name: file.name,
      }));
      this.props.onAdd?.(newFiles);
    };

    const inputText =
      !media.length && showDropZone ?
        "Choose or paste a file"
      : "Choose a file";
    const AddBtn =
      maxFileCount <= media.length || !onAdd ?
        null
      : <label
          htmlFor={id}
          className="FileInput_AddBtn f-1 flex-row ws-nowrap ai-center bg-color-0 pointer rounded text-active b b-active py-p25 pl-p5 pr-1 gap-p25"
          data-command={"FileBtn" satisfies Command}
        >
          <Icon path={mdiPlus} size={1} title="Add files" className=" " />
          <div>{inputText}</div>
          <input
            id={id}
            style={{ width: 0, height: 0, position: "absolute" }}
            type="file"
            accept={accept}
            multiple={maxFileCount > 1}
            onChange={(e) => {
              setFiles(e.target.files ?? ([] as any));
            }}
          />
        </label>;

    const showChevrons = isOverflowing && isViewerMode;
    const showLeftChevron = Boolean(
      showChevrons && this.refWrapper?.scrollLeft,
    );
    const showRightChevron = Boolean(
      showChevrons &&
        (!this.refWrapper?.scrollLeft ||
          this.refWrapper.scrollWidth - 20 >
            this.refWrapper.scrollLeft + this.refWrapper.clientWidth),
    );

    const scrollItem = (val: 1 | -1) => {
      if (this.refWrapper) {
        /** first child will be chevron */
        const mediaSize =
          (this.refWrapper.children[1] as HTMLDivElement).offsetWidth ||
          minSize;
        this.refWrapper.scrollLeft += val * mediaSize;
        this.forceUpdate();
      }
    };
    const scrollNext = () => scrollItem(1);
    const scrollPrev = () => scrollItem(-1);

    const chevronCommonProps = {
      className: "absolute h-full w-fit flex-row ai-center pointer noselect",
      style: { zIndex: 2, top: 0, bottom: 0 },
    };

    return (
      <div
        ref={(e) => {
          if (e) this.ref = e;
        }}
        className={classOverride(
          "FileInput flex-col  min-w-0 min-h-0 b-active ",
          className,
        )}
        style={{ ...style }}
        onDragOver={console.warn}
        onPaste={
          !AddBtn ? undefined : (
            (e) => {
              const files = e.clipboardData.files;
              if (files.length) {
                setFiles(files);
              }
            }
          )
        }
      >
        {popup}
        <div className={"relative flex-col min-w-0 min-h-0 "}>
          {!AddBtn && !label ? null : (
            <FlexCol className={"f-0 "}>
              {label && (
                <div
                  className="noselect text-1p5"
                  style={{ textAlign: "start" }}
                >
                  {label}
                </div>
              )}
              {AddBtn}
              {!media.length && showDropZone && (
                <DropZone onChange={setFiles} />
              )}
            </FlexCol>
          )}
          <div
            className={
              isViewerMode ?
                " f-1 flex-row o-auto min-w-0 min-h-0 o-auto "
              : " flex-row-wrap gap-p25 "
            }
            ref={(e) => {
              if (e) this.refWrapper = e;
            }}
            onScroll={(e) => {
              /** Re-render each 100ms of scrolling to check chevrons */
              const w: any = window;
              if (
                !w.__lastMediaScroll ||
                w.__lastMediaScroll < Date.now() - 100
              ) {
                this.forceUpdate();
                w.__lastMediaScroll = Date.now();
              }
            }}
          >
            {showLeftChevron && (
              <div
                className={chevronCommonProps.className}
                style={{
                  ...chevronCommonProps.style,
                  left: 0,
                  background: "linear-gradient( -90deg, transparent, white)",
                }}
                onClick={scrollPrev}
              >
                <Icon size={1.5} path={mdiChevronLeft} />
              </div>
            )}

            {media.map((mediaItem, i) => {
              return this.renderMedia({
                file: mediaItem,
                i: i + "media",
                onDelete:
                  !onDelete ? undefined : (
                    () => {
                      onDelete(mediaItem);
                    }
                  ),
                onClick: () => {
                  this.setState({ focusedFile: { file: mediaItem, index: i } });
                },
                style:
                  !isViewerMode ?
                    {}
                  : {
                      width: "250px",
                      height: "250px",
                      minWidth: `${minSize}px`,
                      minHeight: `${minSize}px`,
                      margin: 0,
                    },
              });
            })}

            {showRightChevron && (
              <div
                className={chevronCommonProps.className}
                style={{
                  ...chevronCommonProps.style,
                  right: 0,
                  background: "linear-gradient( 90deg, transparent, white)",
                }}
                onClick={scrollNext}
              >
                <Icon size={1.5} path={mdiChevronRight} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
