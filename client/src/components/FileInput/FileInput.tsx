import { mdiChevronLeft, mdiChevronRight, mdiPlus } from "@mdi/js";
import React from "react";
import RTComp from "../../dashboard/RTComp";
import { FlexCol, classOverride } from "../Flex";
import { Icon } from "../Icon/Icon";
import Popup from "../Popup/Popup";
import { DropZone } from "./DropZone";
import { FileInputMedia } from "./FileInputMedia";

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
export class FileInput extends RTComp<
  {
    id?: string;
    className?: string;
    style?: React.CSSProperties;

    media?: Media[];

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
          <FileInputMedia
            file={focusedFile.file}
            i={"focused"}
            // style={{
            //   width: "fit-content",
            //   height: "fit-content",
            //   border: "unset",
            // }}
            onClick={
              !contentType.startsWith("image") ?
                undefined
              : () => {
                  this.setState({ focusedFile: undefined });
                }
            }
            focused={true}
          />
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
          data-command={"FileBtn"}
        >
          <Icon
            path={mdiPlus}
            sizeName={"default"}
            title="Add files"
            className=" "
          />
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
          (this.refWrapper.children[1] as HTMLDivElement).offsetWidth || 150;
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
              return (
                <FileInputMedia
                  key={i}
                  file={mediaItem}
                  i={i + "media"}
                  onDelete={
                    !onDelete ? undefined : (
                      () => {
                        onDelete(mediaItem);
                      }
                    )
                  }
                  onClick={() => {
                    this.setState({
                      focusedFile: { file: mediaItem, index: i },
                    });
                  }}
                  // style={
                  //   !isViewerMode ?
                  //     {}
                  //   : {
                  //       width: "250px",
                  //       height: "250px",
                  //       minWidth: `${minSize}px`,
                  //       minHeight: `${minSize}px`,
                  //       margin: 0,
                  //     }
                  // }
                />
              );
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
