import { getFinalFilterInfo } from "@common/filterUtils";
import { FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import React from "react";
import { isEmpty } from "src/utils/utils";
import type { W_TableProps } from "./W_Table";

export const QuickFilterGroupsControl = ({ w }: W_TableProps) => {
  const { quickFilterGroups = {} } = w.options;
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
                    label: filterName,
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
