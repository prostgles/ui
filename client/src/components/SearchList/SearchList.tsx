import { mdiFormatLetterCase } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type { Command, TestSelectors } from "../../Testing";
import RTComp from "../../dashboard/RTComp";
import Btn from "../Btn";
import Checkbox from "../Checkbox";
import { ClickCatchOverlay } from "../ClickCatchOverlay";
import { DraggableLI } from "../DraggableLI";
import ErrorComponent from "../ErrorComponent";
import { generateUniqueID } from "../FileInput/FileInput";
import { classOverride } from "../Flex";
import { Input } from "../Input";
import { Label } from "../Label";
import "../List.css";
import Loading from "../Loading";
import Popup, { POPUP_CLASSES } from "../Popup/Popup";
import "./SearchList.css";
import type { OptionKey } from "../Select/Select";
import type { Primitive } from "d3";
import { ScrollFade } from "./ScrollFade";

export type SearchListItemContent =
  | {
      content?: React.ReactNode;
    }
  | {
      contentLeft?: React.ReactNode;
      contentRight?: React.ReactNode;
      contentBottom?: React.ReactNode;
    };
export type SearchListItem = TestSelectors & {
  key: OptionKey;
  label?: string | React.ReactNode;
  rowStyle?: React.CSSProperties;
  rowClassname?: string;
  title?: string;
  subLabel?: string;
  ranking?: number | ((searchTerm: string) => number);
  checked?: boolean;
  selected?: boolean;
  onPress?: (
    e:
      | React.MouseEvent<HTMLLIElement, globalThis.MouseEvent>
      | React.KeyboardEvent<HTMLLIElement>,
    term?: string,
  ) => void;
  style?: React.CSSProperties;
  styles?: {
    rowInner?: React.CSSProperties;
    labelWrapper?: React.CSSProperties;
    label?: React.CSSProperties;
    subLabel?: React.CSSProperties;
    labelRootWrapperStyle?: React.CSSProperties;
  };
  data?: AnyObject | Primitive | null;
  disabledInfo?: string;
} & SearchListItemContent;

type ParsedListItem = SearchListItem & {
  node?: React.ReactNode;
  rank?: number;
};

export type SearchListProps<M extends boolean = false> = TestSelectors & {
  defaultSearch?: string;
  defaultValue?: string;

  onChange?: (val: M extends true ? OptionKey[] : OptionKey, e: any) => void;
  onSearch?: (term: string, e: any) => void;
  onSearchItems?: (
    term: string,
    opts?: { matchCase?: boolean },
    onPartialResult?: (
      searchItems: SearchListItem[],
      finished: boolean,
      cancel: Function,
    ) => any,
  ) => Promise<SearchListItem[]>;
  onType?: (term: string, setTerm: (newTerm: string) => void) => void;
  items?: SearchListItem[];
  onReorder?: (newItems: SearchListItem[]) => void;
  style?: React.CSSProperties;
  className?: string;
  /**
   * The id is used for the header checkbox to ensure it works
   */
  id?: string;

  inputID?: string;
  checkboxed?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inputProps?: React.HTMLProps<HTMLInputElement> & TestSelectors;

  /**
   * If provided then allows toggling all values
   */
  onMultiToggle?: (
    items: SearchListItem[],
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  inputEl?: HTMLElement;
  dontHighlight?: boolean;
  label?: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
  variant?: "search" | "search-no-shadow" | "select";
  selectedKey?: OptionKey;
  rootStyle?: React.CSSProperties;

  /**
   * Number of rows to slice from result
   */
  limit?: number;

  /**
   * If number of items is below this value then hide search bar
   */
  noSearchLimit?: number;

  /**
   * If specified then pressing Enter will trigger this instead of the first result UNLESS arrow keys have been moved
   */
  onPressEnter?: (term: string) => any;

  matchCase?:
    | {
        hide?: undefined;
        value?: boolean;
        onChange: (matchCase: boolean) => any;
      }
    | {
        hide: true;
        value?: undefined;
        onChange?: undefined;
      };

  searchStyle?: React.CSSProperties;
  searchEmpty?: boolean;

  /* Used to identify when to refresh the data */
  dataSignature?: string;

  inputStyle?: React.CSSProperties;

  onNoResultsContent?: (searchTerm: string) => React.ReactNode;

  size?: "small";

  rowStyleVariant?: "row-wrap";
};

type SearchListState = {
  searchTerm: string;
  searchItems?: SearchListItem[];
  searchingItems: boolean;
  searchClosed?: boolean;
  matchCase?: boolean;
  selectPopup?: boolean;
  error?: any;
  dataSignature?: string;
  term?: string;
  id: string;
};

const getValueAsText = (v) =>
  ["boolean", "number"].includes(typeof v) ? v.toString() : v;

export default class SearchList<M extends boolean = false> extends RTComp<
  SearchListProps<M>,
  SearchListState
> {
  static getMatch = (args: {
    ranking?: number;
    term: string;
    text: string;
    key?: any;
    subLabel?: string;
    matchCase?: boolean;
    style?: React.CSSProperties;
    subLabelStyle?: React.CSSProperties;
    rootStyle?: React.CSSProperties;
  }): { node: React.ReactNode; rank: number } => {
    const getNode = (r: {
      ranking?: number;
      term: string;
      text: string;
      key?: any;
      isSublabel?: boolean;
      matchCase?: boolean;
      style?: React.CSSProperties;
    }) => {
      const { term, text, key, isSublabel = false, matchCase = false } = r;
      const style: React.CSSProperties =
          !isSublabel ?
            {
              fontSize: "18px",
              fontWeight: term ? undefined : 500,
            }
          : {
              fontSize: "14px",
              marginTop: ".25em",
            },
        rootColorClass = isSublabel ? `SubLabel text-1` : `text-0`;

      const rootStyle = { ...style, ...r.style };
      let rank = 0,
        label = text || "";
      const noTermLabel =
        isSublabel ? label.split("\n").slice(0, 3).join("\n") : label;
      let node = (
        <span className={rootColorClass + ` text-ellipsis`} style={rootStyle}>
          {noTermLabel}
        </span>
      );
      if (term) {
        const lbl = matchCase ? label : label.toLowerCase(),
          strm = matchCase ? term : term.toLowerCase();
        let idx = lbl.indexOf(strm);

        rank = r.ranking ?? idx;
        if (idx > -1) {
          let prevLines, nextLines;
          if (isSublabel) {
            const lines = label.split("\n");
            const matchingLineIdx = lines.findIndex((l) =>
              matchCase ?
                l.includes(term)
              : l.toLowerCase().includes(term.toLowerCase()),
            );
            label = lines[matchingLineIdx] ?? "";
            idx =
              matchCase ?
                label.indexOf(term)
              : label.toLowerCase().indexOf(term.toLowerCase());

            if (matchingLineIdx > 2) {
              prevLines = lines.slice(matchingLineIdx - 2, matchingLineIdx - 1);
            }
            nextLines = lines.slice(matchingLineIdx + 1, matchingLineIdx + 2);
          } else {
            /** Join lines into one */
            label = label.split("\n").join(" ");
          }
          const shortenText = label.length > 40;
          node = (
            <div
              className="MatchRoot flex-col  f-1"
              style={rootStyle}
              title={text}
            >
              {prevLines !== undefined && prevLines.length > 0 && (
                <span className="f-0 text-2 text-ellipsis">
                  {prevLines.join("\n")}
                </span>
              )}
              <div className="MatchRow flex-row f-1">
                <span
                  className={`${shortenText ? "f-1" : "f-0"} ta-right search-text-endings text-ellipsis`}
                  style={{ maxWidth: "fit-content" }}
                >
                  {label.slice(0, idx)}
                </span>
                <strong className="f-0 search-text-match">
                  {label.slice(idx, idx + strm.length)}
                </strong>
                <span
                  className={`${shortenText ? "f-1" : "f-0"} f-1 search-text-endings text-ellipsis`}
                >
                  {label.slice(idx + strm.length)}
                </span>
              </div>
              {nextLines !== undefined && nextLines.length > 0 && (
                <span className="f-0 text-2 text-ellipsis">
                  {nextLines.join("\n")}
                </span>
              )}
            </div>
          );
        } else {
          rank = Infinity;
        }
      }

      if (!label) {
        if (key === "") node = <i>[Empty]</i>;
        if (key === null) node = <i>[NULL]</i>;
      }

      return { rank, node };
    };

    const {
      term,
      text,
      key,
      subLabel,
      matchCase,
      style,
      subLabelStyle,
      rootStyle,
      ranking,
    } = args;
    const node1 = getNode({ term, text, key, matchCase, style, ranking });

    const result = node1;
    if (subLabel) {
      const node2 = getNode({
        term,
        text: subLabel,
        key: subLabel,
        isSublabel: true,
        matchCase,
        style: subLabelStyle,
        ranking: 1,
      });
      result.node = (
        <div className="flex-col f-1" style={rootStyle}>
          {node1.node}
          {node2.node}
        </div>
      );
      let rank = Math.min(node1.rank, node2.rank + 5);
      if (node1.rank !== Infinity && node2.rank !== Infinity) {
        rank /= 2;
      }
      result.rank = rank;
    }
    return result;
  };

  state: SearchListState = {
    searchTerm: "",
    searchItems: undefined,
    searchClosed: true,
    searchingItems: false,
    matchCase: false,
    id: "id",
  };

  onMount() {
    const {
      autoFocus = false,
      defaultSearch,
      defaultValue: df,
      id = generateUniqueID(),
    } = this.props;
    if (autoFocus) {
      setTimeout(this.focusInput, 5);
    }
    this.setState({ id });

    const defaultValue = getValueAsText(df);
    if (typeof defaultValue === "string" && defaultValue) {
      this.setState({ searchTerm: defaultValue });
    } else if (typeof defaultSearch === "string" && defaultSearch) {
      // setTimeout(() => {
      this.onSetTerm(defaultSearch, {});
      // }, 500)
      // this.setState({ searchTerm: defaultSearch }, () => {
      //   // this.props.onChange?.(defaultSearch, {})
      //   // this.props.onSearch?.(defaultSearch, {})
      // });
    }

    window.addEventListener("click", this.onClick);
  }

  /** Toggle search items when clicking the input */
  onClick: EventListenerOrEventListenerObject = (e) => {
    const { variant, onSearchItems } = this.props;
    const { searchClosed, dataSignature, term } = this.state;

    if (variant?.startsWith("search") && this.refList && e.target) {
      if (
        !searchClosed &&
        !this.refList.contains(e.target as Node) &&
        !this.refInput?.contains(e.target as Node)
      ) {
        this.setState({ searchClosed: true });
        this.cancelCurrentSearch?.();
      } else if (
        searchClosed &&
        this.refInput &&
        this.refInput.contains(e.target as Node)
      ) {
        if (
          term &&
          onSearchItems &&
          dataSignature !== this.props.dataSignature
        ) {
          this.onSearchItems(term);
        } else {
          this.setState({ searchClosed: false });
        }
      }
    }
  };

  onUnmount() {
    window.removeEventListener("click", this.onClick);
  }

  onUpdated(prevProps: SearchListProps<M>, prevState: SearchListState) {
    if (this.state.matchCase !== prevState.matchCase && this.state.searchTerm) {
      this.onSetTerm(this.state.searchTerm);
    }

    // const { defaultValue: df } = this.props;
    // const defaultValue = getValueAsText(df)
    // if(df !== prevProps.defaultValue || this.refInput?.value !== defaultValue){
    //   if(typeof defaultValue === "string" && defaultValue){
    //     this.setState({ searchTerm: defaultValue });
    //     if(this.refInput?.value !== defaultValue){
    //       this.refInput.value = defaultValue;
    //     }
    //   }

    // }
  }

  focusInput = () => {
    if (this.refInput) {
      this.refInput.focus();
      // this.refInput.select();
    }
  };

  focusedRowIndex?: number;

  onSetTerm = (searchTerm, e?: any) => {
    const { onSearch, onType } = this.props;
    this.focusedRowIndex = undefined;

    onType?.(searchTerm, (newTerm) => {
      searchTerm = newTerm;
    });
    this.setState({ searchTerm });
    onSearch?.(searchTerm, e);
    this.onSearchItems(searchTerm);
  };

  searching?: {
    term: string;
    dataSignature?: string;
    timeout: any;
  };
  cancelCurrentSearch?: Function;
  onSearchItems = async (term: string) => {
    const { onSearchItems, searchEmpty, dataSignature } = this.props;
    if (!onSearchItems) return;

    if (this.searching) {
      if (this.searching.term === term) {
        return;
      } else {
        clearTimeout(this.searching.timeout);
      }
    }

    if (typeof term !== "string" || (!searchEmpty && !term)) {
      this.setState({ searchItems: [], searchingItems: false });
      onSearchItems(term);
    } else {
      if (!this.state.searchingItems) {
        this.setState({ searchingItems: true });
      }

      this.searching = {
        dataSignature,
        term,
        timeout: setTimeout(async () => {
          if (!this.mounted) return;

          this.setState({ searchingItems: true });
          const matchCase = this.props.matchCase?.value ?? this.state.matchCase;

          try {
            this.props.onSearchItems?.(
              term,
              { matchCase },
              (searchItems, finished, cancel) => {
                this.cancelCurrentSearch = () => {
                  this.setState({ searchingItems: false, error: undefined });
                  cancel();
                  this.searching = undefined;
                };

                if (term === this.searching?.term) {
                  this.setState({
                    searchItems,
                    searchClosed: false,
                    error: undefined,
                    dataSignature,
                    term,
                  });
                  if (finished) {
                    this.cancelCurrentSearch();
                  }
                } else if (!this.searching && this.state.searchingItems) {
                  this.cancelCurrentSearch();
                }
              },
            );
          } catch (error) {
            this.setState({ searchingItems: false, error, searchClosed: true });
          }
        }, 400),
      };
    }
  };

  inputWrapper?: HTMLDivElement;
  refRoot?: HTMLDivElement;
  refInput?: HTMLInputElement;
  refDummyRoot?: HTMLDivElement;
  refList?: HTMLUListElement;
  render() {
    const {
      className = "",
      style = {},
      items = [],
      placeholder = "",
      onReorder,
      onSearch,
      noSearchLimit = 5,
      onMultiToggle,
      inputEl,
      dontHighlight,
      variant,
      selectedKey,
      onSearchItems,
      rootStyle = {},
      label,
      limit = 34,
      onPressEnter,
      searchStyle = {},
      searchEmpty = false,
      size = window.isLowWidthScreen ? "small" : undefined,
      rowStyleVariant,
      inputProps,
      wrapperStyle = {},
    } = this.props;

    const {
      searchTerm: term,
      searchItems = [],
      searchingItems = false,
      searchClosed,
      selectPopup,
      error,
      id,
    } = this.state;

    const multiSelect = !!onMultiToggle;

    const matchCase = this.props.matchCase?.value ?? this.state.matchCase;

    const searchTerm = term;

    let styles: SearchListItem["styles"];
    if (rowStyleVariant === "row-wrap") {
      styles = {
        subLabel: {
          flex: "none",
          textTransform: "uppercase",
        },
        labelRootWrapperStyle: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          columnGap: "1em",
        },
      };
    }

    const getFullItem = (d: SearchListItem): ParsedListItem => {
      const match = SearchList.getMatch({
        matchCase,
        ranking:
          typeof d.ranking === "function" ? d.ranking(searchTerm) : d.ranking,
        term: searchTerm,
        style: d.styles?.label,
        subLabelStyle: { ...styles?.subLabel, ...d.styles?.subLabel },
        rootStyle: {
          ...styles?.labelRootWrapperStyle,
          ...d.styles?.labelRootWrapperStyle,
        },
        text: getValueAsText(d.label !== undefined ? d.label : d.key),
        key: d.key,
        subLabel: d.subLabel,
      });
      return {
        ...d,
        ...match,
      };
    };

    const getLen = (v) => {
      if (typeof v === "string") {
        return v.length;
      }
      return 0;
    };
    const renderedItems: ParsedListItem[] =
      onSearchItems ? searchItems
      : dontHighlight ? items
      : onSearch ? items.map(getFullItem)
      : items
          .map(getFullItem)
          .filter((d, i) => d.rank !== Infinity)
          .sort((a, b) =>
            !searchTerm ? 0 : (
              (a.rank ?? 0) - (b.rank ?? 0) || getLen(a.label) - getLen(b.label)
            ),
          )
          .slice(0, (term ? 2 : 1) * limit);

    const renderedSelected = renderedItems.filter(
      (d) => !d.disabledInfo && d.checked,
    );
    const allSelected = items.filter((d) => d.checked);
    const noSearch =
      !onSearchItems && items.length < noSearchLimit && !searchTerm;
    const hasSearch = !(noSearch || inputEl);
    const isSearch = variant?.startsWith("search");
    const noShadow = variant?.includes("no-shadow");
    const isSelect = variant === "select";

    const endSearch = (force = false) => {
      if (force || (isSearch && !searchClosed)) {
        this.cancelCurrentSearch?.();
        this.setState({ searchTerm: "" });
        this.setState({ searchClosed: true });
      }
    };

    const noList =
      (!renderedItems.length && !searchTerm) || (isSearch && searchClosed);
    const list =
      error ? <ErrorComponent error={error} />
      : noList ? null
      : <ScrollFade
          className={
            "SearchList_Suggestions  relative w-full f-1  min-h-0 min-w-0 no-scroll-bar " +
            (isSearch ? " o-visible " : " o-auto ")
          }
          data-command={this.props["data-command"]}
          data-key={this.props["data-key"]}
        >
          {isSearch && !!renderedItems.length && <ClickCatchOverlay />}
          <ul
            className={
              "f-1 max-h-fit o-auto min-h-0 min-w-0 ul-search-list " +
              (isSearch ? " no-scroll-bar shadow bg-color-0 " : "")
            }
            role="list"
            ref={(r) => {
              if (r) this.refList = r;
            }}
            data-command={"SearchList.List" satisfies Command}
            style={{
              // padding: "0.5em",
              // padding: "0 6px"
              padding: 0,
              ...(!isSearch ?
                {}
              : {
                  position: "absolute",
                  zIndex: 1,
                  left: 0,
                  right: 0,
                  maxHeight: "400px",
                  ...(this.inputWrapper &&
                    (() => {
                      const bbox = this.inputWrapper.getBoundingClientRect();
                      const outlineSize = 1;
                      let top = bbox.top + bbox.height + outlineSize;
                      let left = bbox.left;
                      const popup = this.inputWrapper.closest<HTMLDivElement>(
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
            {onSearch && !this.props.items ?
              null
            : !renderedItems.length && !searchingItems ?
              <div className="p-p5 text-1 no-data">
                {this.props.onNoResultsContent?.(searchTerm) ?? (
                  <div>No results</div>
                )}
              </div>
            : renderedItems.map((d, i) => {
                const onPress: SearchListItem["onPress"] =
                  !d.onPress || d.disabledInfo ?
                    undefined
                  : (e) => {
                      d.onPress!(e, this.state.searchTerm);
                      endSearch();
                    };

                let rowContent: React.ReactNode;
                if ("content" in d) {
                  rowContent = d.content;
                } else {
                  const { contentLeft, contentBottom, contentRight } = d as any;
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
                  <DraggableLI
                    key={i}
                    role="listitem"
                    data-command={d["data-command"]}
                    data-key={asStringIfPossible(d.key)}
                    data-label={asStringIfPossible(d.label)}
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
                    tabIndex={0}
                    idx={i}
                    items={items.slice(0)}
                    onReorder={onReorder}
                    className={classOverride(
                      "noselect bg-li flex-row ai-start p-p5 pl-1 min-w-0 " +
                        (d.selected ? " selected " : "") +
                        (d.disabledInfo ? " not-allowed "
                        : d.onPress ? " pointer "
                        : "") +
                        ((
                          !d.onPress &&
                          !this.props.onChange &&
                          !this.props.onMultiToggle &&
                          !this.props.onPressEnter
                        ) ?
                          " no-hover "
                        : " "),
                      d.rowClassname,
                    )}
                    onClick={(e) => {
                      return onPress?.(e, this.state.searchTerm);
                    }}
                    onKeyUp={
                      !onPress ? undefined : (
                        (e) => {
                          if (e.key === "Enter") {
                            onPress(e, this.state.searchTerm);
                          }
                        }
                      )
                    }
                  >
                    {rowContent}
                  </DraggableLI>
                );
              })
            }
          </ul>
        </ScrollFade>;

    const inputClass = "search-list-comp-input";

    const content = (
      <div
        className={"SearchList list-comp ta-left flex-col min-h-0 " + className}
        ref={(e) => {
          if (e) {
            this.refRoot = e;
          }
        }}
        style={{ ...style, ...(!isSearch ? rootStyle : {}) }} // maxHeight: "50vh",
        onKeyDown={(e) => {
          if (!this.refList) return;
          if (!this.refRoot?.contains(document.activeElement)) return;

          const lastChild = this.refList.lastChild as HTMLLIElement | null,
            firstChild = this.refList.firstChild as HTMLLIElement | null,
            activeElement = document.activeElement as HTMLLIElement,
            previousElementSibling =
              activeElement.previousElementSibling as HTMLElement | null,
            nextElementSibling =
              activeElement.nextElementSibling as HTMLElement | null,
            listNotFocused = !this.refList.contains(activeElement);

          const inputIsFocused = !!activeElement.closest("." + inputClass);

          /* Prevent annoying select all when not within input */
          if (e.key === "a" && e.ctrlKey && !inputIsFocused) {
            if (this.refInput) {
              this.refInput.focus();
              this.refInput.select();
            }
            e.preventDefault();
            return;
          }

          if (e.key === "Enter" && inputIsFocused && firstChild) {
            e.preventDefault();
            if (onPressEnter && this.focusedRowIndex === undefined) {
              onPressEnter(searchTerm);
              endSearch(true);
            } else {
              firstChild.click();
            }
          }

          if (
            !listNotFocused &&
            e.key.length === 1 &&
            !e.shiftKey &&
            !e.ctrlKey &&
            !e.altKey
          ) {
            this.focusInput();
            return;
          }

          switch (e.key) {
            case "ArrowUp":
              if (activeElement === firstChild || listNotFocused) {
                if (lastChild) lastChild.focus();
              } else if (this.refList.childElementCount) {
                if (previousElementSibling) previousElementSibling.focus();
              }
              e.preventDefault();
              this.focusedRowIndex =
                !activeElement.parentElement?.children ?
                  -1
                : Array.from(activeElement.parentElement.children).indexOf(
                    activeElement,
                  );
              break;
            case "ArrowDown":
              if (activeElement === lastChild || listNotFocused) {
                if (firstChild) firstChild.focus();
              } else if (this.refList.childElementCount) {
                if (nextElementSibling) nextElementSibling.focus();
              }
              e.preventDefault();
              this.focusedRowIndex =
                !activeElement.parentElement?.children ?
                  -1
                : Array.from(activeElement.parentElement.children).indexOf(
                    activeElement,
                  );
              break;
          }
        }}
      >
        {!!label && (
          <Label className="ml-p5 mb-p25" variant="normal">
            {label}
          </Label>
        )}
        <div
          className={
            "f-0 min-h-0 min-w-0 flex-row jc-start relative " +
            (!hasSearch && multiSelect ? " bg-color-2 " : "") +
            (isSearch || isSelect ? " " : "  ai-center  ") +
            (!hasSearch && !multiSelect ? " hidden" : "")
          }
          style={searchStyle}
        >
          {!hasSearch ?
            multiSelect ?
              <div className="pl-1 py-p5 noselect text-1p5">
                {allSelected.length || 0} selected
              </div>
            : null
          : <div
              ref={(inputWrapper) => {
                if (inputWrapper) {
                  this.inputWrapper = inputWrapper;
                }
              }}
              className={
                "SearchList_InputWrapper bg-color-0 flex-row h-fit f-1 relative o-hidden relative rounded focus-border b b-color " +
                (isSearch && !noShadow ? " shadow " : " ")
              }
              style={{
                ...wrapperStyle,
                ...(isSearch ? { zIndex: !list ? "unset" : 2 }
                : isSelect ? { margin: "8px", marginBottom: "2px" }
                : {
                    margin: "8px",
                    // margin: "8px",
                    // marginTop: "12px"
                  }),
              }}
              onClick={() => {
                if (!list && searchEmpty) {
                  this.onSetTerm(searchTerm || "", {});
                }
              }}
            >
              <Input
                autoCorrect="off"
                autoCapitalize="off"
                type="text"
                {...inputProps}
                ref={(r) => {
                  if (r) {
                    this.refInput = r;
                  }
                }}
                id={this.props.inputID}
                style={{
                  ...(isSearch && !noList ?
                    {
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                      zIndex: 3,
                    }
                  : {}),
                  ...(!this.props.matchCase?.hide ?
                    {
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                    }
                  : {}),
                  ...this.props.inputStyle,
                  ...(size !== "small" && {
                    padding: "8px 1em",
                    paddingRight: 0,
                  }),
                }}
                placeholder={placeholder}
                autoComplete="off"
                className={inputClass + " f-1 w-full "}
                title={"Search"}
                value={searchTerm}
                onChange={(e) => {
                  const searchTerm = e.currentTarget.value;
                  this.onSetTerm(searchTerm, e);
                }}
              />
              <div
                className="relative rounded f-0 ai-center jc-center flex-row bg-color-0 "
                style={{
                  borderRadius: "3px",
                  overflow: "visible",
                  margin: "0px",
                }}
              >
                {isSearch && searchingItems && (
                  <Loading
                    className="noselect mr-p5 bg-color-0"
                    sizePx={24}
                    variant="cover"
                  />
                )}

                {!this.props.matchCase?.hide && (
                  <Btn
                    title={"Match case"}
                    iconPath={mdiFormatLetterCase}
                    style={{ margin: "1px" }}
                    color={matchCase ? "action" : undefined}
                    onClick={() => {
                      if (this.props.matchCase?.onChange) {
                        this.props.matchCase.onChange(!matchCase);
                      } else {
                        this.setState({ matchCase: !matchCase });
                      }
                    }}
                  />
                )}
              </div>
            </div>
          }
          {!!multiSelect && (
            <Checkbox
              id={id}
              style={{
                paddingLeft: "1em",
                paddingRight: "20px",
                marginLeft: "auto",
              }}
              className={!renderedItems.length ? "hidden" : ""}
              data-command="SearchList.toggleAll"
              checked={Boolean(renderedSelected.length)}
              onChange={(e) => {
                const checked = e.currentTarget.checked;

                const newItems = items.map((d) => {
                  /** If filteted then only update the visible items */
                  const filteredItem =
                    !searchTerm ? d : (
                      renderedItems.find((_d) => _d.key === d.key)
                    );
                  return {
                    ...d,
                    checked:
                      filteredItem ?
                        d.disabledInfo ?
                          d.checked
                        : checked
                      : d.checked,
                  };
                });

                onMultiToggle(newItems, e);
              }}
            />
          )}
        </div>
        {list}
      </div>
    );

    if (variant === "select") {
      if (selectPopup) {
        return (
          <Popup
            onClose={() => {
              this.setState({ selectPopup: false });
            }}
          >
            {content}
          </Popup>
        );
      } else {
        return (
          <Btn
            onClick={() => {
              this.setState({ selectPopup: true });
            }}
          >
            {selectedKey?.toString()}
          </Btn>
        );
      }
    }

    return content;
  }
}
