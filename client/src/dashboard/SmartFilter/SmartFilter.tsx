import type { DetailedFilter } from "@common/filterUtils";
import { isJoinedFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import { FlexCol, classOverride } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import React, { useMemo } from "react";
import type { ContextDataSchema } from "../AccessControl/OptionControllers/FilterControl";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import { DetailedFilterControl } from "../DetailedFilterControl/DetailedFilterControl";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";
import type { FilterWrapperProps } from "../DetailedFilterControl/FilterWrapper";
import { SmartAddFilter } from "./SmartAddFilter";
export * from "./smartFilterUtils";

export type Operand = "AND" | "OR";
export type SmartFilterProps = Pick<FilterWrapperProps, "variant"> & {
  db: DBHandlerClient;
  tableName: string;
  tables: CommonWindowProps["tables"];
  onChange: (filter: DetailedFilter[]) => void;
  detailedFilter?: DetailedFilter[];
  operand?: Operand;
  onOperandChange?: (operand: Operand) => any;
  hideOperand?: boolean;
  className?: string;
  style?: React.CSSProperties;
  filterClassName?: string;
  contextData?: ContextDataSchema;
  hideToggle?: boolean;
  minimised?: boolean;
  showAddFilter?: boolean;
  itemName: "filter" | "condition";
  showNoFilterInfoRow?: boolean;
  type: "having" | "where";
  selectedColumns: ColumnConfig[] | undefined;
  extraFilters: AnyObject[] | undefined;
};

export const SmartFilter = (props: SmartFilterProps) => {
  const {
    db,
    tableName,
    detailedFilter = [],
    className = "",
    style = {},
    tables,
    operand = "AND",
    onOperandChange,
    contextData,
    hideToggle,
    variant,
    selectedColumns,
    onChange,
    filterClassName = "",
    showAddFilter = false,
    extraFilters,
    showNoFilterInfoRow = false,
    itemName,
    hideOperand,
  } = props;

  const table = useMemo(
    () => tables.find((t) => t.name === tableName),
    [tables, tableName],
  );

  if (!table?.columns.length) return null;

  return (
    <FlexCol
      key={"o"}
      style={{
        ...style,
      }}
      className={`SmartFilter ${classOverride(
        `min-w-0 min-h-0 gap-p5 ai-start`,
        className,
      )}`}
    >
      {detailedFilter.map((filterItem, filterItemIndex) => {
        const filterFieldName =
          isJoinedFilter(filterItem) ?
            filterItem.filter.fieldName
          : filterItem.fieldName;

        const otherFilters = detailedFilter.filter(
          (f, i) => i !== filterItemIndex,
        );

        const onChangeDetailedFilter = (
          newFilterItem: DetailedFilter | undefined,
        ) => {
          let newDetailedFilter = [...detailedFilter];
          if (newFilterItem) {
            newDetailedFilter[filterItemIndex] = { ...newFilterItem };
          } else {
            newDetailedFilter = newDetailedFilter.filter(
              (_, i) => i !== filterItemIndex,
            );
          }

          onChange(newDetailedFilter);
        };
        const filterNode = (
          <DetailedFilterControl
            key={filterItemIndex + filterFieldName}
            className={filterClassName}
            filterItem={filterItem}
            table={table}
            tables={tables}
            minimisedOverride={props.minimised}
            variant={variant}
            db={db}
            contextData={contextData}
            otherFilters={otherFilters}
            onChange={onChangeDetailedFilter}
            extraFilters={extraFilters}
            selectedColumns={selectedColumns}
            hideToggle={hideToggle}
          />
        );
        if (
          detailedFilter.length > 1 &&
          filterItemIndex < detailedFilter.length - 1 &&
          !hideOperand
        ) {
          return (
            <React.Fragment key={"filter-item" + filterFieldName}>
              {filterNode}
              <Btn
                className="OPERAND text-active hover"
                title={onOperandChange ? "Press to toggle" : "Operand"}
                onClick={
                  !onOperandChange ? undefined : (
                    () => {
                      onOperandChange(operand === "AND" ? "OR" : "AND");
                    }
                  )
                }
              >
                {operand}
              </Btn>
            </React.Fragment>
          );
        }

        return filterNode;
      })}
      {!detailedFilter.length && showNoFilterInfoRow && (
        <InfoRow color="info" variant="filled">
          No {itemName}s
        </InfoRow>
      )}
      {showAddFilter && (
        <SmartAddFilter
          {...pickKeys(props, [
            "db",
            "tableName",
            "tables",
            "itemName",
            "selectedColumns",
          ])}
          style={{
            boxShadow: "unset",
          }}
          className="w-full mt-1 text-active"
          variant="full"
          onChange={(newF) => {
            onChange([...detailedFilter, ...newF]);
          }}
          btnProps={{
            variant: "faded",
          }}
        />
      )}
    </FlexCol>
  );
};
