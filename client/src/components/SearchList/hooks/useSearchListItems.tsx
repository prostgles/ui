import { Icon } from "@components/Icon/Icon";
import { mdiPlus } from "@mdi/js";
import { isEqual } from "prostgles-types";
import React from "react";
import { FlexRow, FlexRowWrap } from "../../Flex";
import type { SearchListItem, SearchListProps } from "../SearchList";
import { useSearchListItemsSorting } from "./useSearchListItemsSorting";
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
  const { rowStyleVariant, items = [] } = props;
  const styles = rowStyleVariant === "row-wrap" ? rowWrapStyle : undefined;

  const { itemGroupHeaders, renderedItemsWithoutHeaders, getFullItem } =
    useSearchListItemsSorting(props);

  const renderedSelected = renderedItemsWithoutHeaders.filter(
    (d) => !d.disabledInfo && d.checked,
  );

  const allSelected = items.filter((d) => d.checked);

  const renderedItems =
    itemGroupHeaders.length ?
      itemGroupHeaders.flatMap(({ parentLabels }) => {
        const groupItems = renderedItemsWithoutHeaders.filter((d) =>
          isEqual(d.parentLabels, parentLabels),
        );
        const [firstGroupItem] = groupItems;
        if (!firstGroupItem) return [];
        const leftSpacer =
          !parentLabels.length ? undefined : (
            <Icon path={mdiPlus} style={{ opacity: 0 }} />
          );

        return groupItems.map(({ contentLeft, ...item }, index) => {
          const isFirst = index === 0;
          const contentTop =
            !isFirst ? undefined
            : !parentLabels.length ? undefined
            : <FlexRowWrap
                className="SearchList_GroupHeader p-p5 text-1 bg-color-0 bb b-color gap-p25"
                style={{ position: "sticky", top: 0 }}
              >
                {parentLabels.map((label, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-2">{">"}</span>}
                    <span key={i} className="bold" style={{ opacity: 0.75 }}>
                      {label}
                    </span>
                  </React.Fragment>
                ))}
              </FlexRowWrap>;
          return {
            ...item,
            contentTop,
            contentLeft:
              !leftSpacer && !contentLeft ?
                undefined
              : <FlexRow className="gap-0">
                  {contentLeft ?? leftSpacer}
                </FlexRow>,
          };
        });
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
