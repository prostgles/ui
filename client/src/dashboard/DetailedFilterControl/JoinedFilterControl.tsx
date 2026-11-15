import type { DetailedJoinedFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { mdiCheckBold, mdiDelete } from "@mdi/js";
import React from "react";
import { GroupedFilterControl } from "../SmartFilter/GroupedFilterControl";
import { JoinFilterTypeToggle } from "../SmartFilter/JoinFilterTypeToggle";
import type { SmartFilterProps } from "../SmartFilter/SmartFilter";
import { DetailedFilterBaseControl } from "./DetailedFilterBaseControl";
import { JoinedFilterActions } from "./JoinedFilterActions";

type Props = Pick<
  SmartFilterProps,
  | "db"
  | "tables"
  | "contextData"
  | "hideToggle"
  | "variant"
  | "className"
  | "withShadow"
> & {
  filter: DetailedJoinedFilter;
  onChange: (
    filter?: DetailedJoinedFilter,
    childFilterEnabled?: boolean,
  ) => void;
  minimised: boolean | undefined;
};

export const JoinedFilterControl = ({
  filter,
  onChange,
  minimised,
  ...props
}: Props) => {
  const target = filter.path.at(-1);
  if (!target) return <>Missing join path</>;
  const tableName = typeof target === "string" ? target : target.table;
  const collapsed = minimised ?? filter.minimised;
  const group =
    "fieldName" in filter.filter ? { $and: [filter.filter] } : filter.filter;
  const conditions = "$and" in group ? group.$and : group.$or;
  const [singleCondition] = conditions;
  if (
    conditions.length === 1 &&
    singleCondition &&
    "fieldName" in singleCondition
  ) {
    const table = props.tables.find((table) => table.name === tableName);
    const column = table?.columns.find(
      (column) => column.name === singleCondition.fieldName,
    );
    if (table && column) {
      return (
        <DetailedFilterBaseControl
          {...props}
          tableName={tableName}
          column={{ ...column, type: "column" }}
          label={`${table.label || tableName}.${column.label || column.name}`}
          selectedColumns={undefined}
          otherFilters={[]}
          extraFilters={undefined}
          rootFilter={{ value: filter, onChange }}
          headerActions={
            <JoinedFilterActions
              db={props.db}
              tableName={tableName}
              tables={props.tables}
              newFilterType={props.contextData ? "=" : undefined}
              onAdd={(newConditions) =>
                onChange({
                  ...filter,
                  minimised: false,
                  filter:
                    "$and" in group ?
                      { $and: [...conditions, ...newConditions] }
                    : { $or: [...conditions, ...newConditions] },
                })
              }
            />
          }
          filter={{
            ...singleCondition,
            type: singleCondition.type ?? "=",
            minimised: collapsed,
            disabled: filter.disabled || singleCondition.disabled,
          }}
          onChange={(updatedCondition) => {
            if (!updatedCondition || !("fieldName" in updatedCondition))
              return onChange();
            const disabledChanged =
              !!updatedCondition.disabled !==
              !!(filter.disabled || singleCondition.disabled);
            const childFilterEnabled =
              disabledChanged && !updatedCondition.disabled;
            const condition = {
              ...updatedCondition,
              disabled: childFilterEnabled ? false : singleCondition.disabled,
            };
            onChange(
              {
                ...filter,
                disabled:
                  disabledChanged ? updatedCondition.disabled : filter.disabled,
                minimised: updatedCondition.minimised,
                filter:
                  "fieldName" in filter.filter ? condition
                  : "$and" in filter.filter ? { $and: [condition] }
                  : { $or: [condition] },
              },
              childFilterEnabled,
            );
          }}
        />
      );
    }
  }
  return (
    <FlexCol
      className={`min-w-0 w-fit max-w-full b b-active rounded p-p5 gap-p5 ${props.withShadow ? "shadow" : ""} ${props.className ?? ""}`}
      style={{ borderRadius: collapsed ? "1em" : undefined }}
      data-command="JoinedFilterControl"
      data-filter-disabled={filter.disabled || undefined}
    >
      <FlexRow className="JoinedFilterControl_Header gap-0">
        {!props.hideToggle && (
          <Btn
            iconPath={mdiCheckBold}
            className="DisableEnableToggle"
            title={filter.disabled ? "Enable filter" : "Disable filter"}
            color={filter.disabled ? undefined : "action"}
            onClick={() => onChange({ ...filter, disabled: !filter.disabled })}
          />
        )}
        {!collapsed && (
          <JoinFilterTypeToggle
            value={filter.type}
            disabled={filter.disabled}
            onChange={(type) => onChange({ ...filter, type })}
          />
        )}
        <Btn
          variant="text"
          title="Expand/collapse joined conditions"
          onClick={() => onChange({ ...filter, minimised: !collapsed })}
        >
          {filter.path
            .map((pathItem) => {
              const joinedTableName =
                typeof pathItem === "string" ? pathItem : pathItem.table;
              return (
                props.tables.find((table) => table.name === joinedTableName)
                  ?.label || joinedTableName
              );
            })
            .join(" > ")}
        </Btn>
        {!collapsed && (
          <Btn
            iconPath={mdiDelete}
            className="ml-auto"
            title="Delete joined filter"
            onClick={() => onChange()}
          />
        )}
      </FlexRow>
      <GroupedFilterControl
        {...props}
        tableName={tableName}
        type="where"
        itemName="condition"
        selectedColumns={undefined}
        extraFilters={undefined}
        newFilterType={props.contextData ? "=" : undefined}
        minimised={collapsed ? true : undefined}
        hideToggle={collapsed || props.hideToggle}
        showAddFilter={!collapsed}
        filter={group}
        onChange={(innerFilter, childFilterEnabled) =>
          onChange(
            {
              ...filter,
              filter: innerFilter,
              minimised: collapsed ? false : filter.minimised,
              disabled:
                childFilterEnabled || "fieldName" in filter.filter ?
                  false
                : filter.disabled,
            },
            childFilterEnabled,
          )
        }
      />
    </FlexCol>
  );
};
