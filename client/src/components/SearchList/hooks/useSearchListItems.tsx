import { isEqual } from "prostgles-types";
import React from "react";
import { FlexRowWrap } from "../../Flex";
import { getSearchListMatchAndHighlight } from "../getSearchListMatchAndHighlight";
import type {
  ParsedListItem,
  SearchListItem,
  SearchListProps,
} from "../SearchList";
import { getValueAsText } from "../SearchListContent";
import type { SearchListState } from "./useSearchListSearch";

export const useSearchListItems = (
  props: Pick<
    SearchListProps,
    | "rowStyleVariant"
    | "limit"
    | "onSearchItems"
    | "onSearch"
    | "items"
    | "dontHighlight"
  > &
    Pick<SearchListState, "searchItems" | "searchTerm"> & {
      matchCase: boolean;
    },
) => {
  const {
    rowStyleVariant,
    searchTerm,
    onSearchItems,
    searchItems,
    items = [],
    dontHighlight,
    onSearch,
    matchCase,
    limit = 34,
  } = props;
  const styles = rowStyleVariant === "row-wrap" ? rowWrapStyle : undefined;

  const getFullItem = (d: SearchListItem): ParsedListItem => {
    const match = getSearchListMatchAndHighlight({
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
      text: getValueAsText(d.label !== undefined ? d.label : d.key) ?? "",
      key: d.key,
      subLabel: d.subLabel,
    });
    return {
      ...d,
      ...match,
    };
  };

  const sortDisabledLast = (a: ParsedListItem, b: ParsedListItem) =>
    Number(!!a.disabledInfo) - Number(!!b.disabledInfo);
  const renderedItemsWithoutHeaders: ParsedListItem[] =
    onSearchItems ? searchItems
    : dontHighlight ? items
    : onSearch ? items.map(getFullItem)
    : items
        .map(getFullItem)
        .filter((d, i) => d.rank !== Infinity)
        .sort(
          (a, b) =>
            sortDisabledLast(a, b) ||
            (!searchTerm ? 0 : (
              (a.rank ?? 0) - (b.rank ?? 0) || getLen(a.label) - getLen(b.label)
            )),
        )
        .slice(0, (searchTerm ? 2 : 1) * limit);

  const renderedSelected = renderedItemsWithoutHeaders.filter(
    (d) => !d.disabledInfo && d.checked,
  );
  const allSelected = items.filter((d) => d.checked);
  const itemGroupHeaders = renderedItemsWithoutHeaders
    .reduce((a, v) => {
      if (
        !v.parentLabels ||
        a.some((labels) => isEqual(labels, v.parentLabels))
      ) {
        return a;
      }
      return [...a, v.parentLabels];
    }, [] as string[][])
    .map((parentLabels) => ({
      header: parentLabels.join(" > "),
      parentLabels,
    }));
  // .sort((a, b) => a.header.localeCompare(b.header));

  const renderedItems =
    itemGroupHeaders.length ?
      itemGroupHeaders.flatMap(({ header, parentLabels }) => {
        const [firstGroupItem, ...otherGroupItems] =
          renderedItemsWithoutHeaders.filter((d) =>
            isEqual(d.parentLabels, parentLabels),
          );
        if (!firstGroupItem) return [];
        const contentLeft =
          !parentLabels.length ? undefined : <div style={{ width: "1em" }} />;
        return [
          {
            ...firstGroupItem,
            contentLeft,
            contentTop:
              !parentLabels.length ? undefined : (
                <FlexRowWrap
                  className="SearchList_GroupHeader p-1 my-p5 text-1 bg-color-0 bb b-color gap-p25"
                  style={{ position: "sticky", top: 0 }}
                >
                  {parentLabels.map((label, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-2">{">"}</span>}
                      <span key={i} className="bold">
                        {label}
                      </span>
                    </React.Fragment>
                  ))}
                </FlexRowWrap>
              ),
          },
          ...(!contentLeft ? otherGroupItems : (
            otherGroupItems.map((d) => ({
              ...d,
              contentLeft,
            }))
          )),
        ];
      })
    : renderedItemsWithoutHeaders;

  return {
    renderedItems,
    renderedSelected,
    allSelected,
    itemGroupHeaders,
    styles,
    getFullItem,
  };
};

const getLen = (v) => {
  if (typeof v === "string") {
    return v.length;
  }
  return 0;
};

const rowWrapStyle = {
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
} satisfies SearchListItem["styles"];
