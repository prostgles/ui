import React from "react";
import Checkbox from "../Checkbox";
import { ClickCatchOverlay } from "../ClickCatchOverlay";
import { DraggableLI } from "../DraggableLI";
import { classOverride } from "../Flex";
import { POPUP_CLASSES } from "../Popup/Popup";
import { useScrollFade } from "../ScrollFade/ScrollFade";
import type {
  ParsedListItem,
  SearchListItem,
  SearchListProps,
} from "./SearchList";

export type SearchListItemsProps = Pick<
  SearchListProps,
  | "items"
  | "onSearch"
  | "data-command"
  | "data-key"
  | "endOfResultsContent"
  | "noResultsContent"
  | "onReorder"
> & {
  renderedItems: ParsedListItem[];
  isSearch: boolean | undefined;
  searchTerm: string | undefined;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
  searchingItems: boolean;
  endSearch: (force?: boolean) => void;
  id: string;
  showHover: boolean;
};
export const SearchListItems = React.forwardRef<
  HTMLUListElement,
  SearchListItemsProps
>((props: SearchListItemsProps, ref) => {
  const {
    id,
    renderedItems,
    items = [],
    searchTerm,
    isSearch,
    onSearch,
    inputWrapperRef,
    endOfResultsContent,
    noResultsContent,
    searchingItems,
    endSearch,
    onReorder,
  } = props;
  const inputWrapper = inputWrapperRef.current;
  const notAllItemsShown =
    renderedItems.length && renderedItems.length < items.length && !searchTerm;

  const ulRef = React.useRef<HTMLUListElement>(null);

  useScrollFade({
    ref: ulRef,
  });

  return (
    <div
      className={
        "SearchList_Suggestions flex-col relative w-full f-1  min-h-0 min-w-0 " +
        (isSearch ? " o-visible " : " ")
      }
      data-command={props["data-command"]}
      data-key={props["data-key"]}
    >
      {isSearch && !!renderedItems.length && <ClickCatchOverlay />}
      <ul
        className={
          "no-decor f-1 max-h-fit o-auto min-h-0 min-w-0 ul-search-list o-auto  no-scroll-bar " +
          (isSearch ? " no-scroll-bar shadow bg-color-0 " : "")
        }
        role="listbox"
        ref={ref}
        data-command={"SearchList.List"}
        style={{
          padding: 0,
          ...(!isSearch ?
            {}
          : {
              position: "absolute",
              zIndex: 1,
              left: 0,
              right: 0,
              maxHeight: "400px",
              ...(inputWrapper &&
                (() => {
                  const bbox = inputWrapper.getBoundingClientRect();
                  const outlineSize = 1;
                  let top = bbox.top + bbox.height + outlineSize;
                  let left = bbox.left;
                  const popup = inputWrapper.closest<HTMLDivElement>(
                    `.${POPUP_CLASSES.root}`,
                  );
                  if (popup && popup.style.transform) {
                    const pRect = popup.getBoundingClientRect();
                    top -= Math.round(pRect.top);
                    left -= Math.round(pRect.left);
                  }
                  return {
                    position: "fixed",
                    top,
                    left,
                    zIndex: 13213213,
                    right: bbox.right,
                    width: `${bbox.width}px`,
                  };
                })()),
            }),
        }}
      >
        {onSearch && !props.items ? null : (
          renderedItems.map((d, i) => {
            const onPress: SearchListItem["onPress"] =
              !d.onPress || d.disabledInfo ?
                undefined
              : (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  d.onPress!(e, searchTerm);
                  endSearch();
                };

            let rowContent: React.ReactNode;
            if ("content" in d) {
              rowContent = d.content;
            } else {
              const { contentLeft, contentBottom, contentRight } = d;
              rowContent = (
                <div
                  className="ROWINNER flex-row ai-center f-1 "
                  style={d.styles?.rowInner}
                >
                  {contentLeft || null}
                  <div
                    className="LABELWRAPPER flex-col ai-start f-1"
                    style={d.styles?.labelWrapper}
                  >
                    <label
                      className={
                        "ws-pre mr-p5 f-1 flex-row noselect min-w-0 w-full " +
                        (d.disabledInfo ? " not-allowed "
                        : d.onPress ? " pointer "
                        : " ")
                      }
                      style={d.style}
                    >
                      {d.node}
                    </label>
                    {contentBottom}
                  </div>
                  {contentRight || null}
                  {typeof d.checked === "boolean" ?
                    <Checkbox
                      id={id}
                      className="f-0 no-pointer-events"
                      checked={d.checked}
                      style={{ marginRight: "12px" }}
                      onChange={() => {}}
                    />
                  : null}
                </div>
              );
            }

            const asStringIfPossible = (v: any) => {
              if (typeof v === "string" || typeof v === "number") {
                return v.toString();
              }
              if (v === null) {
                return "null";
              }
              return "";
            };
            return (
              <React.Fragment key={i}>
                {d.contentTop}
                <DraggableLI
                  role={onPress ? "option" : "listitem"}
                  data-command={d["data-command"]}
                  data-key={asStringIfPossible(d.key)}
                  data-label={asStringIfPossible(d.label)}
                  aria-disabled={!!d.disabledInfo}
                  aria-selected={!!d.selected}
                  title={d.disabledInfo ?? d.title}
                  style={{
                    ...d.rowStyle,
                    ...(d.disabledInfo ?
                      {
                        cursor: "not-allowed",
                        opacity: 0.4,
                        touchAction: "none",
                        // pointerEvents: "none",
                      }
                    : {}),
                  }}
                  tabIndex={-1}
                  idx={i}
                  items={items.slice(0)}
                  onReorder={onReorder}
                  className={classOverride(
                    "noselect bg-li flex-row ai-start p-p5 pl-1 min-w-0 " +
                      (d.selected ? " selected " : "") +
                      (d.disabledInfo ? " not-allowed "
                      : d.onPress ? " pointer "
                      : "") +
                      (!d.onPress && !props.showHover ? " no-hover " : " "),
                    d.rowClassname,
                  )}
                  onClick={(e) => {
                    return onPress?.(e, searchTerm);
                  }}
                  onKeyUp={
                    !onPress ? undefined : (
                      (e) => {
                        if (e.key === "Enter") {
                          onPress(e, searchTerm);
                        }
                      }
                    )
                  }
                >
                  {rowContent}
                </DraggableLI>
              </React.Fragment>
            );
          })
        )}
        {!renderedItems.length && !searchingItems && (
          <div className="p-p5 text-1 no-data">
            {noResultsContent ??
              (!endOfResultsContent ? <div>No results</div> : null)}
          </div>
        )}
        {notAllItemsShown ?
          <div className="p-p5 pl-1 noselect text-2">
            Not all items shown...
          </div>
        : endOfResultsContent}
      </ul>
    </div>
  );
});
