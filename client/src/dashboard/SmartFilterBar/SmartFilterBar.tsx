import {
  mdiTableColumn,
  mdiTableRow,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useEffect, useState } from "react";
import type {
  SimpleFilter,
  SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import { isJoinedFilter } from "../../../../commonTypes/filterUtils";
import type { PrglCore, Theme } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRowWrap, classOverride } from "../../components/Flex";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { IsTable } from "../Dashboard/dashboardUtils";
import { SmartAddFilter } from "../SmartFilter/SmartAddFilter";
import { SmartFilter } from "../SmartFilter/SmartFilter";
import type {
  ColumnConfig,
  ColumnSort,
} from "../W_Table/ColumnMenu/ColumnMenu";
import { SmartFilterBarSearch } from "./SmartFilterBarSearch";
import { SmartFilterBarRightActions } from "./SmartFilterBarRightActions";
import { Label } from "../../components/Label";

export type SmartFilterBarProps = PrglCore & {
  theme: Theme;
  className?: string;
  innerClassname?: string;
  style?: React.CSSProperties;

  filterFields?: string[];
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showInsertUpdateDelete?: {
    onSuccess?: VoidFunction;
    showinsert?: boolean;
    showupdate?: boolean;
    showdelete?: boolean;
  };
  rowCount: number;
  hideSort?: boolean;
  extraFilters?: AnyObject[];
  fixedData?: AnyObject;
} & (
    | {
        w: WindowSyncItem<"table"> | WindowSyncItem<"card">;
      }
    | {
        filter?: SmartGroupFilter;
        having?: SmartGroupFilter;
        table_name: string;
        onChange: (newFilter: SmartGroupFilter, isAggregate?: boolean) => any;
        onHavingChange: (newFilter: SmartGroupFilter) => any;
        onSortChange?: (newSort: ColumnSort | undefined) => any;
        sort?: ColumnSort;
        /**
         * Used for sorting
         */
        columns?: ColumnConfig[];
      }
  );

export const SmartFilterBar = (props: SmartFilterBarProps) => {
  const {
    db,
    tables,
    leftContent,
    filterFields,
    style,
    className,
    innerClassname,
  } = props;

  const { filter: _fltr = [], having: _having = [] } =
    "w" in props ? props.w : props;
  const { table_name } = "w" in props ? props.w : props;
  const onHavingChange =
    "w" in props ?
      (having) => {
        props.w.$update({ having }, { deepMerge: true });
      }
    : props.onHavingChange;
  const onFilterChange = (
    filter: SmartGroupFilter,
    addedFilter?: SimpleFilter,
    isAggregate?: boolean,
  ) => {
    if (isAggregate && addedFilter) {
      const newHaving = [..._having, addedFilter];
      onHavingChange(newHaving);
    } else {
      if ("w" in props) {
        props.w.$update({ filter }, { deepMerge: true });
      } else {
        props.onChange(filter, isAggregate);
      }
    }
  };

  const w: WindowSyncItem<"table"> | WindowSyncItem<"card"> | undefined =
    "w" in props ? props.w : undefined;
  const selectedColumns = "w" in props ? w?.columns : props.columns;

  const table = tables.find((t) => t.name === table_name);

  const filter: SmartGroupFilter = _fltr.map((f) => ({ ...f }));
  const having: SmartGroupFilter = _having.map((f) => ({ ...f }));
  const [colFilterLayout, setColFilterLayout] = useState(false);
  const filterLayoutClass = colFilterLayout ? "flex-col" : "flex-row-wrap";
  if (!table_name || !table) return null;
  const someFiltersExpanded = filter.some((f) => !f.minimised);
  const hasFilters = !!filter.length;
  const havingFiltersNode = !!having.length && (
    <FlexCol
      key="having"
      className={`gap-p5 min-h-0 f-0 relative ai-start my-p5 ${hasFilters ? "bb b-color" : ""} pb-p5`}
    >
      <Label
        variant="normal"
        info={<>HAVING clause is used to filter aggregate expressions</>}
      >
        Having
      </Label>
      <SmartFilter
        className={`mr-1 mt-p5 ${filterLayoutClass}`}
        type="having"
        selectedColumns={selectedColumns ?? []}
        itemName="filter"
        filterClassName={"shadow b b-action"}
        tables={tables}
        db={db}
        tableName={table_name}
        detailedFilter={having}
        onChange={onHavingChange}
        operand={IsTable(w) && w.options.havingOperand === "OR" ? "OR" : "AND"}
        onOperandChange={
          !w?.$update ?
            undefined
          : (filterOperand) => {
              w.$update({ options: { filterOperand } }, { deepMerge: true });
            }
        }
        extraFilters={props.extraFilters}
      />
    </FlexCol>
  );
  const renderedFilters = hasFilters && (
    <FlexCol
      key="where"
      className={"gap-p5 min-h-0 f-0 relative ai-start my-p5"}
    >
      {havingFiltersNode && (
        <Label
          variant="normal"
          info={
            <>
              WHERE clause is used to filter data before aggregate column
              filters are applied in the HAVING clause
            </>
          }
        >
          Where
        </Label>
      )}
      <SmartFilter
        className={`mr-1 mt-p5 ${filterLayoutClass}`}
        type="where"
        selectedColumns={selectedColumns ?? []}
        itemName="filter"
        filterClassName={"shadow b b-action"}
        tables={tables}
        db={db}
        tableName={table_name}
        detailedFilter={filter}
        onChange={onFilterChange}
        operand={IsTable(w) && w.options.filterOperand === "OR" ? "OR" : "AND"}
        onOperandChange={
          !w?.$update ?
            undefined
          : (filterOperand) => {
              w.$update({ options: { filterOperand } }, { deepMerge: true });
            }
        }
        extraFilters={props.extraFilters}
      />
    </FlexCol>
  );

  return (
    <div
      className={
        "SmartFilterBar flex-col min-h-0 min-w-0 relative  " + className
      }
      style={style}
    >
      {leftContent}

      <FlexRowWrap
        className={classOverride(
          "min-h-0 f-0 relative ai-center gap-p5",
          innerClassname,
        )}
      >
        <SmartAddFilter
          selectedColumns={selectedColumns ?? []}
          tableName={table_name}
          filterFields={filterFields}
          db={db}
          tables={tables}
          detailedFilter={filter}
          onChange={onFilterChange}
        />
        {Boolean(filter.length) && (
          <>
            <Btn
              title="Expand/Collapse filters"
              iconPath={
                window.isMobileDevice ?
                  !someFiltersExpanded ?
                    mdiUnfoldMoreHorizontal
                  : mdiUnfoldLessHorizontal
                : undefined
              }
              onClick={() => {
                const newFilters = toggleAllFilters(filter);

                onFilterChange(newFilters);
              }}
            >
              {window.isMobileDevice ? null : (
                `${!someFiltersExpanded ? "Expand" : "Collapse"} filters`
              )}
            </Btn>
            <Btn
              title="Filter layout"
              iconPath={colFilterLayout ? mdiTableColumn : mdiTableRow}
              onClick={() => {
                setColFilterLayout(!colFilterLayout);
              }}
            />
          </>
        )}
        <div className={"flex-row f-1 mx-p5 jc-center mr-p5 ai-center"}>
          <SmartFilterBarSearch
            db={db}
            table={table}
            tableName={table_name}
            tables={tables}
            onFilterChange={onFilterChange}
            filter={filter}
            extraFilters={props.extraFilters}
          />
          <SmartFilterBarRightActions {...props} />
        </div>
      </FlexRowWrap>
      {havingFiltersNode}
      {renderedFilters}
    </div>
  );
};

export const toggleAllFilters = (
  filters: SimpleFilter[],
  minimised?: boolean,
) => {
  const someFiltersExpanded = minimised ?? filters.some((f) => !f.minimised);

  return filters.map((f) => {
    if (isJoinedFilter(f)) {
      f.filter.minimised = someFiltersExpanded;
    }
    return {
      ...f,
      minimised: someFiltersExpanded,
    };
  });
};
