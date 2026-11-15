import {
  flattenGroupedFilter,
  type DetailedFilter,
  type GroupedDetailedFilter,
} from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexRow, FlexRowWrap } from "@components/Flex";
import { mdiDelete, mdiFilterVariantPlus } from "@mdi/js";
import React from "react";
import { SmartAddFilter } from "./SmartAddFilter";
import type { SmartFilterProps } from "./SmartFilter";
import { DetailedFilterControl } from "../DetailedFilterControl/DetailedFilterControl";

type Props = Omit<
  SmartFilterProps,
  "detailedFilter" | "onChange" | "operand" | "onOperandChange"
> & {
  filter: GroupedDetailedFilter;
  onChange: (
    filter: GroupedDetailedFilter,
    childFilterEnabled: boolean,
  ) => void;
};

export const GroupedFilterControl = ({
  filter: originalFilter,
  onChange,
  className = "",
  ...props
}: Props) => {
  const filter =
    props.minimised ? flattenGroupedFilter(originalFilter) : originalFilter;
  const isAnd = "$and" in filter;
  const filters = isAnd ? filter.$and : filter.$or;
  const hideOperand = props.hideOperand || props.minimised;
  const table = props.tables.find((t) => t.name === props.tableName);
  if (!table?.columns.length) return null;
  const setFilters = (
    items: (DetailedFilter | GroupedDetailedFilter)[],
    childFilterEnabled = false,
  ) => onChange(isAnd ? { $and: items } : { $or: items }, childFilterEnabled);

  return (
    <FlexRowWrap
      className={`${props.minimised ? "GroupedFilterControl_Minimised flex-col gap-0 b" : "gap-p5"} min-w-0 w-fit max-w-full ai-start ${className}`}
      data-command="GroupedFilterControl"
    >
      {filters.map((item, index) => {
        const updateItem = (
          replacement?: DetailedFilter | GroupedDetailedFilter,
          childFilterEnabled = false,
        ) =>
          setFilters(
            filters.flatMap((current, i) =>
              i !== index ? [current]
              : replacement ? [replacement]
              : [],
            ),
            childFilterEnabled,
          );
        const filterContent =
          "$and" in item || "$or" in item ?
            <FlexRow
              className={`ai-start ${props.minimised ? "pl-1" : "b b-color rounded p-p5"} gap-p5 min-w-0 max-w-full`}
            >
              <GroupedFilterControl
                {...props}
                className="flex-col"
                hideOperand={false}
                filter={item}
                onChange={updateItem}
              />
              {!props.minimised && (
                <Btn
                  iconPath={mdiDelete}
                  className="GroupedFilterControl_Actions"
                  title="Delete group"
                  onClick={() => updateItem()}
                />
              )}
            </FlexRow>
          : <DetailedFilterControl
              {...props}
              table={table}
              filterItem={item}
              minimisedOverride={props.minimised}
              otherFilters={[]}
              onChange={(updatedFilter, childFilterEnabled) =>
                updateItem(
                  updatedFilter,
                  childFilterEnabled ||
                    !!(
                      item.disabled &&
                      updatedFilter &&
                      !updatedFilter.disabled
                    ),
                )
              }
            />;
        return (
          <React.Fragment key={index}>
            {props.minimised ?
              <FlexRow className="gap-0 min-w-0 max-w-full ai-center">
                {index > 0 && !props.hideOperand && (
                  <span className="ml-p5 py-p25 font-14 text-1">
                    {isAnd ? "AND" : "OR"}
                  </span>
                )}
                {filterContent}
              </FlexRow>
            : filterContent}
          </React.Fragment>
        );
      })}
      {(!hideOperand || props.showAddFilter) && (
        <FlexRow className="GroupedFilterControl_Actions gap-p5">
          {!hideOperand && (
            <Btn
              title="Combine conditions"
              children={isAnd ? "and" : "or"}
              iconPath=""
              onClick={() =>
                onChange(!isAnd ? { $and: filters } : { $or: filters }, false)
              }
            />
          )}
          {props.showAddFilter && (
            <>
              <SmartAddFilter
                db={props.db}
                tableName={props.tableName}
                tables={props.tables}
                itemName={props.itemName}
                selectedColumns={props.selectedColumns}
                newFilterType={props.newFilterType}
                onChange={(items) => setFilters([...filters, ...items])}
                style={{
                  boxShadow: "unset",
                }}
              />
              <Btn
                title="Add group"
                color="action"
                iconPath={mdiFilterVariantPlus}
                onClick={() => setFilters([...filters, { $and: [] }])}
              />
            </>
          )}
        </FlexRow>
      )}
    </FlexRowWrap>
  );
};
