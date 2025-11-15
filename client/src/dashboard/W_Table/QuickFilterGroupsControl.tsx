import { FlexCol, FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import React from "react";
import { isEmpty } from "src/utils";
import type { W_TableProps } from "./W_Table";
import { getFinalFilterInfo } from "@common/filterUtils";

export const QuickFilterGroupsControl = ({ w }: W_TableProps) => {
  const { quickFilterGroups = {} } = w.options;
  if (isEmpty(quickFilterGroups)) {
    return null;
  }
  return (
    <FlexCol className="gap-p5 pt-p5">
      <div className="text-2">Quick filters</div>
      <FlexRowWrap>
        {Object.entries(quickFilterGroups).map(
          ([groupName, { filters, toggledFilterName }]) => {
            return (
              <Select
                asRow={true}
                key={groupName}
                labelAsValue={true}
                emptyLabel={groupName}
                optional={true}
                onChange={(filterName) => {
                  const newQuickFilterGroups = { ...quickFilterGroups };
                  newQuickFilterGroups[groupName]!.toggledFilterName =
                    filterName;
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
    </FlexCol>
  );
};
