import { isDefined } from "prostgles-types";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import { useEffect, useMemo, useState } from "react";
import {
  getColumnsAcceptedByFunction,
  type FuncDef,
} from "../FunctionSelector/functions";
import { getAllJoins } from "../JoinPathSelectorV2";
import type { QuickAddComputedColumnProps } from "./QuickAddComputedColumn";

export const useAddComputedColumnState = ({
  tables,
  tableName,
}: Pick<QuickAddComputedColumnProps, "tables" | "tableName">) => {
  const table = useMemo(
    () => tables.find((t) => t.name === tableName),
    [tables, tableName],
  );
  const [includeJoins, setIncludeJoins] = useState(true);

  const [funcDef, setFuncDef] = useState<FuncDef | undefined>();
  const allowedColumns: undefined | ValidatedColumnInfoWithJoin[] =
    useMemo(() => {
      if (!funcDef || !table) return undefined;
      const tableColumns = getColumnsAcceptedByFunction(funcDef, table.columns);
      if (!includeJoins || !tableColumns) {
        return tableColumns;
      }

      const { allJoins } = getAllJoins({ tableName, tables, value: undefined });

      const joinedColumns = allJoins
        .map((join) => {
          const { table: joinTable } = join;
          const joinColumns = getColumnsAcceptedByFunction(
            funcDef,
            joinTable!.columns,
          );
          if (!joinColumns?.length) return;

          return joinColumns.map((col) => ({
            ...col,
            join,
            label: `${join.label}.${col.label || col.name}`,
          }));
        })
        .filter(isDefined)
        .flat();

      return [...tableColumns, ...joinedColumns];
    }, [funcDef, includeJoins, table, tableName, tables]);

  const [column, setColumn] = useState<
    ValidatedColumnInfoWithJoin | undefined
  >();
  const [name, setName] = useState("");
  useEffect(() => {
    if (!funcDef) {
      return;
    }
    const name =
      column ?
        `${funcDef.label}( ${[column.join?.table.name, column.name].filter(isDefined).join(".")} )`
      : funcDef.label;
    setName(name);
  }, [funcDef, column]);

  return {
    table,
    includeJoins,
    setIncludeJoins,
    name,
    setName,
    column,
    setColumn,
    allowedColumns,
    setFuncDef,
    funcDef,
  };
};

export type ValidatedColumnInfoWithJoin = ValidatedColumnInfo & {
  join?: ReturnType<typeof getAllJoins>["allJoins"][0];
};

export type AddComputedColumnState = ReturnType<
  typeof useAddComputedColumnState
>;
