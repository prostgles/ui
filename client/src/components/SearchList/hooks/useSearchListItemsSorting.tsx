import { Icon } from "@components/Icon/Icon";
import { SvgIcon } from "@components/SvgIcon";
import { isEqual } from "prostgles-types";
import React, { useCallback, useMemo } from "react";
import { getSearchListMatchAndHighlight } from "../getSearchListMatchAndHighlight";
import type {
  ParsedListItem,
  SearchListItem,
  SearchListProps,
} from "../SearchList";
import { getValueAsText } from "../SearchListContent";
import type { SearchListState } from "./useSearchListSearch";

export const useSearchListItemsSorting = (
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
    items: rawItemsWithLeftIcons = [],
    dontHighlight,
    onSearch,
    matchCase,
    limit = 34,
  } = props;
  const styles = rowStyleVariant === "row-wrap" ? rowWrapStyle : undefined;
  const items = useMemo(() => {
    return rawItemsWithLeftIcons.map((item) => {
      if (item.iconLeft !== undefined) {
        const { iconLeft, ...searchListItem } = item;
        return {
          ...searchListItem,
          contentLeft: (
            <div
              title={iconLeft.title}
              style={iconLeft.style}
              data-command={iconLeft["data-command"]}
              data-key={iconLeft["data-key"]}
              className={
                "f-0 text-1p5 " + (searchListItem.contentBottom ? "mt-p25" : "")
              }
            >
              {iconLeft.type === "Icon" ?
                <Icon path={iconLeft.path} />
              : <SvgIcon icon={iconLeft.pathName} />}
            </div>
          ),
        };
      }
      return item;
    });
  }, [rawItemsWithLeftIcons]);

  const getFullItem = useCallback(
    (searchListItem: SearchListItem): ParsedListItem => {
      const match = getSearchListMatchAndHighlight({
        matchCase,
        ranking:
          typeof searchListItem.ranking === "function" ?
            searchListItem.ranking(searchTerm)
          : searchListItem.ranking,
        term: searchTerm,
        style: searchListItem.styles?.label,
        subLabelStyle: {
          ...styles?.subLabel,
          ...searchListItem.styles?.subLabel,
        },
        rootStyle: {
          ...styles?.labelRootWrapperStyle,
          ...searchListItem.styles?.labelRootWrapperStyle,
        },
        text:
          getValueAsText(
            searchListItem.label !== undefined ?
              searchListItem.label
            : searchListItem.key,
          ) ?? "",
        key: searchListItem.key,
        subLabel: searchListItem.subLabel,
      });
      return {
        ...searchListItem,
        ...match,
      };
    },
    [matchCase, searchTerm, styles],
  );

  const sortDisabledLast = (a: ParsedListItem, b: ParsedListItem) =>
    Number(!!a.disabledInfo) - Number(!!b.disabledInfo);
  const renderedItemsWithoutHeaders: ParsedListItem[] = useMemo(
    () =>
      onSearchItems ? searchItems
      : dontHighlight ? items
      : onSearch ? items.map(getFullItem)
      : items
          .map(getFullItem)
          .filter(({ rank }) => !searchTerm || rank !== Infinity)
          .sort(
            (a, b) =>
              sortDisabledLast(a, b) ||
              (!searchTerm ? 0 : (
                (a.rank ?? 0) - (b.rank ?? 0) ||
                (a.parentLabels?.length ?? 0) - (b.parentLabels?.length ?? 0) ||
                getLen(a.label) - getLen(b.label)
              )),
          )
          .slice(0, (searchTerm ? 2 : 1) * limit),
    [
      dontHighlight,
      getFullItem,
      items,
      limit,
      onSearch,
      onSearchItems,
      searchItems,
      searchTerm,
    ],
  );

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
  return { itemGroupHeaders, renderedItemsWithoutHeaders, getFullItem };
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
