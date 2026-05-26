import React from "react";
import { FlexCol } from "@components/Flex";
import { Label } from "@components/Label";
import { SmartFilter } from "../SmartFilter/SmartFilter";
import type { SmartFilterBarProps } from "./SmartFilterBar";
import type { useSmartFilterBarState } from "./useSmartFilterBarState";

type P = Pick<SmartFilterBarProps, "db" | "tables" | "extraFilters"> & {
  state: Exclude<ReturnType<typeof useSmartFilterBarState>, { type: "error" }>;
};

export const SmartFilterBarFilters = ({
  state,
  db,
  tables,
  extraFilters,
}: P) => {
  const {
    hasFilters,
    hasHavingFilters,
    filterLayoutClass,
    selectedColumns,
    filter,
    table,
    having,
    onHavingChange,
    onFilterChange,
    havingOperand,
    filterOperand,
    onFilterOperandChange,
    onHavingOperandChange,
  } = state;

  return (
    <>
      {hasHavingFilters && (
        <FlexCol
          key="having"
          data-key={"having"}
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
            tableName={table.name}
            detailedFilter={having}
            onChange={onHavingChange}
            operand={havingOperand}
            onOperandChange={onHavingOperandChange}
            extraFilters={extraFilters}
          />
        </FlexCol>
      )}
      {!!filter.length && (
        <FlexCol
          key="where"
          data-key={"where"}
          className={"gap-p5 min-h-0 f-0 relative ai-start my-p5"}
        >
          {hasHavingFilters && (
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
            tableName={table.name}
            detailedFilter={filter}
            onChange={onFilterChange}
            operand={filterOperand}
            onOperandChange={onFilterOperandChange}
            extraFilters={extraFilters}
          />
        </FlexCol>
      )}
    </>
  );
};
