import { isDefined, pickKeys } from "prostgles-types";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FUCTION_DEFINITIONS,
  getColumnsAcceptedByFunction,
  type FuncDef,
} from "../FunctionSelector/functions";
import { getAllJoins } from "../JoinPathSelectorV2";
import type { QuickAddComputedColumnProps } from "./QuickAddComputedColumn";
import type { ColumnConfig } from "../ColumnMenu";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";

export const useAddComputedColumnState = ({
  tableName,
  onAddColumn,
  existingColumn,
}: Pick<
  QuickAddComputedColumnProps,
  "tableName" | "onAddColumn" | "existingColumn"
>) => {
  const { tables } = usePrgl();
  const table = useMemo(
    () => tables.find((t) => t.name === tableName),
    [tables, tableName],
  );
  const [includeJoins, setIncludeJoins] = useState(true);

  const existingColumnInfo = useMemo(() => {
    if (!existingColumn?.computedConfig || !table) return undefined;
    const config = existingColumn.computedConfig;
    return {
      args: config.args,
      funcDef:
        FUCTION_DEFINITIONS.find((f) => f.key === config.funcDef.key) ||
        undefined,
      column: table.columns.find((c) => c.name === config.column),
    };
  }, [existingColumn, table]);

  const [funcDef, setFuncDef] = useState<FuncDef | undefined>(
    existingColumnInfo?.funcDef,
  );
  const [args, setArgs] = useState<
    Required<ColumnConfig>["computedConfig"]["args"]
  >(existingColumnInfo?.args);

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

  const [column, setColumn] = useState<ValidatedColumnInfoWithJoin | undefined>(
    existingColumnInfo?.column,
  );
  const [name, setName] = useState(existingColumn?.name || "");

  useEffect(() => {
    if (!funcDef) {
      return;
    }
    const name =
      column ?
        `${funcDef.label}( ${[column.join?.table.label, column.name].filter(isDefined).join(".")} )`
      : funcDef.label;
    setName(name);
  }, [funcDef, column]);

  const addColumn = useCallback(
    (column: ValidatedColumnInfoWithJoin | undefined, funcDef: FuncDef) => {
      const { outType } = funcDef;
      const outInfo = outType === "sameAsInput" ? column : outType;
      if (!outInfo) {
        throw new Error(
          "Cannot determine output data type for the computed column",
        );
      }

      if (column?.join) {
        onAddColumn({
          name,
          nested: {
            columns: [
              {
                name,
                show: true,
                computedConfig: {
                  ...pickKeys(outInfo, ["tsDataType", "udt_name"]),
                  funcDef,
                  column: column.name,
                },
              },
              ...column.join.table.columns.map((c) => ({
                name: c.name,
                show: false,
              })),
            ],
            path: column.join.path,
          },
          show: true,
        });
      } else {
        onAddColumn({
          name,
          show: true,
          computedConfig: {
            ...pickKeys(outInfo, ["tsDataType", "udt_name"]),
            funcDef,
            args,
            column: column?.name,
          },
        });
      }
    },
    [onAddColumn, name, args],
  );

  const [onAddDisabledInfo, onAdd] =
    !funcDef ? ["Must select a function", undefined]
    : funcDef.requiresArg && !args?.[funcDef.requiresArg] ?
      [`Must provide argument: ${funcDef.requiresArg}`, undefined]
    : allowedColumns && !column ? ["Must select a column", undefined]
    : [undefined, () => addColumn(column, funcDef)];

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
    onAddDisabledInfo,
    onAdd,
    args,
    setArgs,
  };
};

export type ValidatedColumnInfoWithJoin = ValidatedColumnInfo & {
  join?: ReturnType<typeof getAllJoins>["allJoins"][0];
};

export type AddComputedColumnState = ReturnType<
  typeof useAddComputedColumnState
>;
