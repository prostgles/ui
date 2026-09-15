import type {
  DetailedFilter,
  GroupedDetailedFilter,
} from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
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
  onChange: (filter: GroupedDetailedFilter) => void;
};

export const GroupedFilterControl = ({ filter, onChange, ...props }: Props) => {
  const isAnd = "$and" in filter;
  const filters = isAnd ? filter.$and : filter.$or;
  const table = props.tables.find((t) => t.name === props.tableName);
  if (!table?.columns.length) return null;
  const setFilters = (items: (DetailedFilter | GroupedDetailedFilter)[]) =>
    onChange(isAnd ? { $and: items } : { $or: items });

  return (
    <FlexCol
      className="gap-p5 min-w-0 ai-start"
      data-command="GroupedFilterControl"
    >
      {filters.map((item, index) => {
        const updateItem = (
          replacement?: DetailedFilter | GroupedDetailedFilter,
        ) =>
          setFilters(
            filters.flatMap((current, i) =>
              i !== index ? [current]
              : replacement ? [replacement]
              : [],
            ),
          );
        if ("$and" in item || "$or" in item) {
          return (
            <FlexRow key={index} className="ai-start b rounded p-p5 gap-p5">
              <GroupedFilterControl
                {...props}
                hideOperand={false}
                filter={item}
                onChange={updateItem}
              />
              <Btn
                iconPath={mdiDelete}
                title="Delete group"
                onClick={() => updateItem()}
              />
            </FlexRow>
          );
        }
        return (
          <DetailedFilterControl
            {...props}
            key={index}
            className={props.filterClassName}
            table={table}
            filterItem={item}
            minimisedOverride={props.minimised}
            otherFilters={[]}
            onChange={updateItem}
          />
        );
      })}
      {(!props.hideOperand || props.showAddFilter) && (
        <FlexRow className="gap-p5">
          {!props.hideOperand && (
            <Btn
              title="Combine conditions"
              children={isAnd ? "AND" : "OR"}
              iconPath=""
              onClick={() =>
                onChange(!isAnd ? { $and: filters } : { $or: filters })
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
    </FlexCol>
  );
};
