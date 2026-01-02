import { useScrollFade } from "@components/ScrollFade/ScrollFade";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { ClickCatchOverlay } from "../ClickCatchOverlay";
import { DraggableLI } from "../DraggableLI";
import { classOverride, FlexCol } from "../Flex";
import { POPUP_CLASSES } from "../Popup/Popup";
import type {
  ParsedListItem,
  SearchListItem,
  SearchListProps,
} from "./SearchList";
import { SearchListRowContent } from "./SearchListRowContent";

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
  showHover: boolean;
};
export const SearchListItems = forwardRef<
  HTMLUListElement | null,
  SearchListItemsProps
>((props: SearchListItemsProps, ref) => {
  const {
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

  const [node, setNode] = useState<HTMLUListElement | null>(null);
  const handleRef = useCallback((el: HTMLUListElement | null) => {
    setNode(el);
  }, []);
  useImperativeHandle(ref, () => node as HTMLUListElement, [node]);
  useScrollFade(node);

  const listStyle = useMemo(() => {
    return {
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
                zIndex: 3,
                right: bbox.right,
                width: `${bbox.width}px`,
              };
            })()),
        }),
    } satisfies React.CSSProperties;
  }, [inputWrapper, isSearch]);

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
      <FlexCol
        className={
          "f-1 max-h-fit min-h-0 min-w-0  rounded-b" +
          (isSearch ? "  shadow bg-color-0 " : "")
        }
        style={listStyle}
      >
        <ul
          className={
            "no-decor f-1 max-h-fit min-h-0 min-w-0 ul-search-list o-auto rounded-b  no-scroll-bar " +
            (isSearch ? "  shadow bg-color-0 " : "")
          }
          role="listbox"
          ref={handleRef}
          data-command={"SearchList.List"}
        >
          {onSearch && !props.items ? null : (
            renderedItems.map((renderedItem, i) => {
              const onPress: SearchListItem["onPress"] =
                !renderedItem.onPress || renderedItem.disabledInfo ?
                  undefined
                : (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    renderedItem.onPress!(e, searchTerm);
                    endSearch();
                  };

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
                  {renderedItem.contentTop}
                  <DraggableLI
                    role={onPress ? "option" : "listitem"}
                    data-command={renderedItem["data-command"]}
                    data-key={asStringIfPossible(renderedItem.key)}
                    data-label={asStringIfPossible(renderedItem.label)}
                    aria-disabled={!!renderedItem.disabledInfo}
                    aria-selected={!!renderedItem.selected}
                    title={renderedItem.disabledInfo ?? renderedItem.title}
                    style={{
                      ...renderedItem.rowStyle,
                      ...(renderedItem.disabledInfo ?
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
                      "noselect bg-li flex-row ai-start p-p5 min-w-0 " +
                        (renderedItem.selected ? " selected " : "") +
                        (renderedItem.disabledInfo ? " not-allowed "
                        : renderedItem.onPress ? " pointer "
                        : "") +
                        (!renderedItem.onPress && !props.showHover ?
                          " no-hover "
                        : " "),
                      renderedItem.rowClassname,
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
                    <SearchListRowContent item={renderedItem} />
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
      </FlexCol>
    </div>
  );
});
