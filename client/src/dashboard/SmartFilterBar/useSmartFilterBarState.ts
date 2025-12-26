import type { DetailedFilter } from "@common/filterUtils";
import { useMemo, useState } from "react";
import { IsTable, type WindowSyncItem } from "../Dashboard/dashboardUtils";
import type { Operand } from "../SmartFilter/SmartFilter";
import type { SmartFilterBarProps } from "./SmartFilterBar";

export const useSmartFilterBarState = (props: SmartFilterBarProps) => {
  const [colFilterLayout, setColFilterLayout] = useState(false);
  const { table_name } = "w" in props ? props.w : props;
  const { tables } = props;

  const table = useMemo(() => {
    return table_name && tables.find((t) => t.name === table_name);
  }, [table_name, tables]);

  return useMemo(() => {
    if (!table) {
      return {
        type: "error",
        error: `Table ${JSON.stringify(table_name)} not found`,
      } as const;
    }

    const { filter: _fltr = [], having: _having = [] } =
      "w" in props ? props.w : props;
    const onHavingChange =
      "w" in props ?
        (having) => {
          props.w.$update({ having }, { deepMerge: true });
        }
      : (havingFilter: DetailedFilter[]) => {
          props.onHavingChange?.(havingFilter);
        };
    const onFilterChange = (
      filter: DetailedFilter[],
      addedFilter?: DetailedFilter,
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

    const filter: DetailedFilter[] = _fltr.map((f) => ({ ...f }));
    const having: DetailedFilter[] = _having.map((f) => ({ ...f }));

    const filterLayoutClass = colFilterLayout ? "flex-col" : "flex-row-wrap";
    const hasFilters = !!filter.length;
    const hasHavingFilters = !!having.length;

    const havingOperand =
      IsTable(w) && w.options.havingOperand === "OR" ? "OR" : "AND";
    const filterOperand =
      IsTable(w) && w.options.filterOperand === "OR" ? "OR" : "AND";

    const onFilterOperandChange =
      !w?.$update ?
        undefined
      : (filterOperand: Operand) => {
          w.$update({ options: { filterOperand } }, { deepMerge: true });
        };
    const onHavingOperandChange =
      !w?.$update ?
        undefined
      : (havingOperand: Operand) => {
          w.$update({ options: { havingOperand } }, { deepMerge: true });
        };
    const someFiltersExpanded = filter.some((f) => !f.minimised);

    return {
      table,
      filter,
      having,
      hasFilters,
      hasHavingFilters,
      filterLayoutClass,
      selectedColumns,
      onFilterChange,
      onHavingChange,
      havingOperand,
      filterOperand,
      colFilterLayout,
      setColFilterLayout,
      onFilterOperandChange,
      onHavingOperandChange,
      someFiltersExpanded,
    } as const;
  }, [props, colFilterLayout, table_name, table]);
};
