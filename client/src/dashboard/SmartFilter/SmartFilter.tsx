import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { ValidatedColumnInfo, AnyObject } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import React from "react";
import type {
  DetailedFilterBase,
  JoinedFilter,
  SimpleFilter,
  SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import {
  isDetailedFilter,
  isJoinedFilter,
} from "../../../../commonTypes/filterUtils";
import { isObject } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, classOverride } from "../../components/Flex";
import type { ContextDataSchema } from "../AccessControl/OptionControllers/FilterControl";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";
import { Filter } from "./Filter";
import type { FilterWrapperProps } from "./FilterWrapper";
import { SmartAddFilter } from "./SmartAddFilter";
import {
  DEFAULT_VALIDATED_COLUMN_INFO,
  type FilterColumn,
} from "./smartFilterUtils";
import { InfoRow } from "../../components/InfoRow";
export * from "./smartFilterUtils";

type Operand = "AND" | "OR";
export type SmartFilterProps = Pick<FilterWrapperProps, "variant"> & {
  db: DBHandlerClient;
  tableName: string;
  tables: CommonWindowProps["tables"];
  onChange: (filter: SmartGroupFilter) => void;
  detailedFilter?: SmartGroupFilter;
  operand?: Operand;
  onOperandChange?: (operand: Operand) => any;
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
  } = props;

  const tableColumns = tables.find((t) => t.name === tableName)?.columns;

  const content =
    !tableColumns?.length ?
      null
    : <FlexCol
        key={"o"}
        style={{
          ...style,
        }}
        className={`SmartFilter ${classOverride(
          `min-w-0 min-h-0 gap-p5 ai-start`,
          className,
        )}`}
      >
        {detailedFilter.map((filterItem, di) => {
          let col: FilterColumn | undefined,
            fieldName,
            label,
            tName = tableName;
          let tableCol: ValidatedColumnInfo | undefined;
          if (isJoinedFilter(filterItem)) {
            ({ fieldName } = filterItem.filter);
            const lastPathItem = filterItem.path.at(-1);
            if (!lastPathItem) return <>Filter path lastPathItem missing</>;
            const lastTableName =
              isObject(lastPathItem) ? lastPathItem.table : lastPathItem;
            const nestedTableCol = tables
              .find((t) => t.name === lastTableName)
              ?.columns.find((c) => c.name === fieldName);
            tableCol = nestedTableCol;
            tName = lastTableName;
            label =
              filterItem.path
                .map((p) => (isObject(p) ? p.table : p))
                .join(" > ") +
              "." +
              fieldName;
          } else {
            ({ fieldName } = filterItem);
            tableCol = tableColumns.find((c) => c.name === fieldName);
            const selectedCol = selectedColumns?.find(
              (c) => c.name === fieldName,
            );
            const computedConfig = selectedCol?.computedConfig;
            if (computedConfig) {
              col = {
                type: "computed",
                columns: selectedColumns ?? [],
                label: selectedCol.name,
                name: selectedCol.name,
                computedConfig,
                ...computedConfig.funcDef.outType,
              };
              tableCol = undefined;
            }
            label = col?.name ?? fieldName;
          }

          if (tableCol) {
            col = {
              type: "column",
              ...tableCol,
            };
          }

          /**
           * Maybe add computed columns to dbo schema?!!
           */
          if (!col) {
            col = {
              type: "column",
              ...DEFAULT_VALIDATED_COLUMN_INFO,
              name: fieldName,
              label: fieldName,
            };
          }
          const otherFilters: (
            | SimpleFilter
            | JoinedFilter
            | DetailedFilterBase
          )[] = props.detailedFilter?.filter((f, i) => i !== di) ?? [];
          const onChangeFilter = (
            newFilterItem: typeof filterItem | undefined,
          ) => {
            let newDetailedFilter = [...detailedFilter];
            if (newFilterItem) {
              newDetailedFilter[di] = { ...newFilterItem };
            } else {
              newDetailedFilter = newDetailedFilter.filter((_, i) => i !== di);
            }

            onChange(newDetailedFilter);
          };
          const filterProps = {
            className: `${filterClassName} min-w-0 min-h-0`,
            key: di + fieldName,
            db,
            label,
            tableName: tName,
            column: col,
            variant,
            tables,
            contextData,
            hideToggle,
            selectedColumns,
            filter: isJoinedFilter(filterItem) ? filterItem.filter : filterItem,
            otherFilters:
              isJoinedFilter(filterItem) ?
                otherFilters
                  .filter(isDetailedFilter)
                  .map((f: DetailedFilterBase) => {
                    const res: JoinedFilter = {
                      type: filterItem.type,
                      path: [
                        ...filterItem.path.slice(0).reverse().slice(1),
                        props.tableName,
                      ],
                      filter: f,
                    };
                    return res;
                  })
              : otherFilters,
            onChange: (f: typeof filterItem | undefined) => {
              let newValue = f;
              if (f && isJoinedFilter(filterItem)) {
                if (isJoinedFilter(f)) {
                  throw "Nested join filters not allowed";
                }
                newValue = {
                  ...filterItem,
                  disabled: f.disabled,
                  minimised: f.minimised,
                  filter: { ...f },
                };
              }
              onChangeFilter(newValue);
            },
            extraFilters,
          };
          const filterNode = (
            <Filter
              {...filterProps}
              rootFilter={
                isJoinedFilter(filterItem) ?
                  { value: filterItem, onChange: onChangeFilter }
                : undefined
              }
              filter={{
                ...filterProps.filter,
                minimised: props.minimised ?? filterProps.filter.minimised,
              }}
              tables={tables}
            />
          );

          if (detailedFilter.length > 1 && di < detailedFilter.length - 1) {
            return (
              <React.Fragment key={"o" + di}>
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
            defaultType="="
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
      </FlexCol>;

  return content;
};
