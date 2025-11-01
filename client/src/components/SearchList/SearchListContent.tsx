import { isObject } from "@common/publishUtils";
import React, { useEffect, useMemo } from "react";
import Checkbox from "../Checkbox";
import ErrorComponent from "../ErrorComponent";
import { generateUniqueID } from "../FileInput/FileInput";
import { Label } from "../Label";
import { SearchInput } from "./SearchInput";
import type { SearchListProps } from "./SearchList";
import { SearchListItems } from "./SearchListItems";
import { useSearchListItems } from "./hooks/useSearchListItems";
import { useSearchListOnClick } from "./hooks/useSearchListOnClick";
import {
  SEARCH_LIST_INPUT_CLASSNAME,
  useSearchListOnKeyUpDown,
} from "./hooks/useSearchListOnKeyUpDown";
import { useSearchListSearch } from "./hooks/useSearchListSearch";

export const SearchListContent = <M extends boolean = false>(
  props: SearchListProps<M>,
) => {
  const {
    rootStyle = {},
    label,
    searchStyle = {},
    variant,
    onMultiToggle,
    items = [],
    inputID,
    className,
    onSearchItems,
    searchEmpty = false,
    placeholder,
    inputProps,
    inputEl,
    noSearchLimit = 5,
    style = {},
    autoFocus,
    onChange,
    onPressEnter,
    dataSignature,
    leftContent,
    noBorder,
  } = props;
  const multiSelect = !!onMultiToggle;
  const isSearch = variant?.startsWith("search");
  const noShadow = variant?.includes("no-shadow");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const refList = React.useRef<HTMLUListElement>(null);
  const idRef = React.useRef(props.id ?? generateUniqueID());
  const id = idRef.current;
  const showHover = Boolean(onChange || onMultiToggle || onPressEnter);
  const {
    matchCase,
    setMatchCase,
    onSetTerm,
    searchTerm,
    endSearch,
    searchClosed,
    searchItems = [],
    error,
    searchingItems,
    onStartSearch,
    searching,
    setSearchClosed,
  } = useSearchListSearch({ ...props, isSearch });

  const { renderedItems, allSelected, renderedSelected } = useSearchListItems({
    ...props,
    searchItems,
    searchTerm,
    matchCase,
  });

  const noList = isSearch ? searchClosed : !renderedItems.length && !searchTerm;

  const wrapperStyleFinal = useMemo(() => {
    if (noBorder)
      return {
        borderRadius: 0,
        borderTop: "unset",
        borderBottom: "unset",
      };
    if (searchClosed) return {};
    return {
      ...{
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      },
    };
  }, [noBorder, searchClosed]);

  useSearchListOnClick({
    isSearch,
    dataSignature,
    onStartSearch,
    refInput: inputRef,
    refList: refList,
    searching,
    searchClosed,
    setSearchClosed,
  });

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 5);
    }
  }, [autoFocus]);

  const { onKeyDown } = useSearchListOnKeyUpDown({
    refList,
    onPressEnter,
    endSearch,
    searchTerm,
    refInput: inputRef,
  });

  const noSearch =
    !onSearchItems && items.length < noSearchLimit && !searchTerm;

  const hasSearch = !(noSearch || inputEl);

  const listNode =
    error ? <ErrorComponent error={error} />
    : noList ? null
    : <SearchListItems
        {...props}
        id={id}
        ref={refList}
        renderedItems={renderedItems}
        isSearch={isSearch}
        searchTerm={searchTerm}
        inputWrapperRef={inputWrapperRef}
        searchingItems={searchingItems}
        endSearch={endSearch}
        showHover={showHover}
      />;
  return (
    <div
      data-command="SearchList"
      className={"SearchList list-comp ta-left flex-col min-h-0 " + className}
      ref={rootRef}
      onKeyDown={onKeyDown}
      style={{ ...style, ...(!isSearch ? rootStyle : {}) }} // maxHeight: "50vh",
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
          (isSearch ? " " : "  ai-center  ") +
          (!hasSearch && !multiSelect ? " hidden" : "")
        }
        style={searchStyle}
      >
        {leftContent}
        {!hasSearch ?
          multiSelect ?
            <div className="pl-1 py-p5 noselect text-1p5 ws-nowrap">
              {allSelected.length || 0} selected
            </div>
          : null
        : <SearchInput
            id={inputID}
            withShadow={isSearch && !noShadow}
            inputRef={inputRef}
            inputWrapperRef={inputWrapperRef}
            onClickWrapper={(e) => {
              if (!listNode && searchEmpty) {
                onSetTerm(searchTerm || "", e);
              }
            }}
            wrapperStyle={wrapperStyleFinal}
            className={SEARCH_LIST_INPUT_CLASSNAME}
            data-command="SearchList.Input"
            {...inputProps}
            placeholder={placeholder}
            title={"Search"}
            value={searchTerm}
            onChange={(e) => {
              const searchTerm = e.currentTarget.value;
              onSetTerm(searchTerm, e);
            }}
            mode={
              isSearch ?
                {
                  "!listNode": !listNode,
                  "!noList": !noList,
                }
              : undefined
            }
            matchCase={
              props.matchCase?.hide ?
                undefined
              : {
                  value: !!matchCase,
                  onChange: (matchCase) => {
                    if (props.matchCase?.onChange) {
                      props.matchCase.onChange(matchCase);
                    } else {
                      setMatchCase(matchCase);
                    }
                  },
                }
            }
            isLoading={isSearch && searchingItems}
          />
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
      {listNode}
    </div>
  );
};

export const getValueAsText = (v): string | null | undefined =>
  v && (isObject(v) || Array.isArray(v)) ? JSON.stringify(v) : v?.toString();
