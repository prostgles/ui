import {
  getFinalFilterInfo,
  getTableFilterFromDetailedGroupFilter,
  type DetailedFilter,
} from "@common/filterUtils";
import { FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import React from "react";
import { isEmpty } from "src/utils/utils";
import type { W_TableProps } from "./W_Table";
import { usePromise } from "prostgles-client";
import { fromEntries, getEntries } from "@common/utils";

export const QuickFilterGroupsControl = ({ w, prgl: { db } }: W_TableProps) => {
  const { quickFilterGroups = {} } = w.options;
  const groupCounts = usePromise(async () => {
    const fetchCount = db[w.table_name]?.count;
    if (!fetchCount) return undefined;
    return Promise.all(
      getEntries(quickFilterGroups).map(async ([groupName, { filters }]) => {
        const filterCounts = await Promise.all(
          getEntries(filters).map(async ([filterName, filter]) => {
            const count = await fetchCount(
              getTableFilterFromDetailedGroupFilter(filter as DetailedFilter),
            );
            return [filterName as string, count] as const;
          }),
        );
        return [groupName as string, fromEntries(filterCounts)] as const;
      }),
    ).then(fromEntries);
  }, [db, w.table_name, quickFilterGroups]);

  if (isEmpty(quickFilterGroups)) {
    return null;
  }
  return (
    <FlexRowWrap
      data-command="QuickFilterGroupsControl"
      title="Quick filters"
      className="gap-p5 p-p5"
    >
      {Object.entries(quickFilterGroups).map(
        ([groupName, { filters, toggledFilterName }]) => {
          return (
            <Select
              asRow={true}
              key={groupName}
              labelAsValue={true}
              emptyLabel={groupName}
              optional={true}
              size="small"
              onChange={(filterName) => {
                const newQuickFilterGroups = { ...quickFilterGroups };
                newQuickFilterGroups[groupName]!.toggledFilterName = filterName;
                w.$update(
                  {
                    options: {
                      quickFilterGroups: newQuickFilterGroups,
                    },
                  },
                  { deepMerge: true },
                );
              }}
              btnProps={toggledFilterName ? { color: "action" } : {}}
              value={toggledFilterName}
              fullOptions={Object.entries(filters).map(
                ([filterName, filter]) => {
                  return {
                    key: filterName,
                    label:
                      filterName +
                      (groupCounts ?
                        ` (${groupCounts[groupName]?.[filterName] ?? "?"})`
                      : ""),
                    subLabel: getFinalFilterInfo(filter as any),
                  };
                },
              )}
            />
          );
        },
      )}
    </FlexRowWrap>
  );
};
