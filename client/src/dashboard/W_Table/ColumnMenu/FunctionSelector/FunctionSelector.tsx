import { Select } from "@components/Select/Select";
import { mdiFunction, mdiSigma } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo } from "react";
import type { ColumnConfig } from "../ColumnMenu";
import {
  funcAcceptsColumn,
  getAggFuncs,
  getFuncs,
  type FuncDef,
} from "./functions";

type P = {
  selectedFunction?: string;
  column: string | undefined;
  /**
   * If defined then this is not a nested column
   */
  wColumns: ColumnConfig[] | undefined;
  tableColumns: ValidatedColumnInfo[];
  onSelect: (func: FuncDef | undefined) => void;
  className?: string;
  currentNestedColumnName?: string;
};

export const FunctionSelector = ({
  column,
  tableColumns,
  onSelect,
  selectedFunction,
  wColumns: parentColumns,
  className,
  currentNestedColumnName,
}: P) => {
  const cannotUseAggs = useMemo(
    () =>
      parentColumns?.some(
        (c) => c.show && c.nested && c.name !== currentNestedColumnName,
      ),
    [parentColumns, currentNestedColumnName],
  );

  const funcs = useMemo(() => {
    const columnInfo = tableColumns.find((c) => c.name === column);
    const funcs = [...getAggFuncs(), ...getFuncs()]
      .map((f) => ({
        ...f,
        isAllowedForColumn: funcAcceptsColumn(
          f,
          columnInfo ? [columnInfo] : tableColumns,
        ),
      }))
      .filter((f) => f.isAllowedForColumn);
    return funcs;
  }, [column, tableColumns]);

  return (
    <>
      <Select
        id="func_selector"
        data-command="FunctionSelector"
        className={className}
        style={{ maxHeight: "500px" }}
        value={selectedFunction}
        label={"Applied function"}
        placeholder="Search functions..."
        showSelectedSublabel={true}
        optional={true}
        onChange={(key) => {
          const def = funcs.find((f) => f.key === key);
          onSelect(def);
        }}
        noSearchLimit={5}
        variant={selectedFunction ? undefined : "search-list-only"}
        fullOptions={funcs.map((def) => {
          return {
            ...def,
            iconPath: def.isAggregate ? mdiSigma : mdiFunction,
            disabledInfo:
              cannotUseAggs && def.isAggregate ?
                "Cannot use aggregations with nested column"
              : def.isAllowedForColumn ? undefined
              : "Not suitable for the selected column data type",
          };
        })}
      />
    </>
  );
};
