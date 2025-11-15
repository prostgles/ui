import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiFunction, mdiSigma } from "@mdi/js";
import { pickKeys } from "prostgles-types";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { t } from "src/i18n/i18nUtils";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnConfig } from "../ColumnMenu";
import {
  getColumnsAcceptedByFunction,
  type FuncDef,
} from "../FunctionSelector/functions";
import { FunctionSelector } from "../FunctionSelector/FunctionSelector";
import { getColumnListItem } from "../ColumnSelect/getColumnListItem";

type QuickAddComputedColumnProps = {
  tables: DBSchemaTablesWJoins;
  tableName: string;
  onAddColumn: (newColumn: ColumnConfig | undefined) => void;
};

export const FunctionColumnList = ({
  tableName,
  tables,
  onAddColumn,
}: QuickAddComputedColumnProps) => {
  const table = useMemo(
    () => tables.find((t) => t.name === tableName),
    [tables, tableName],
  );

  const [funcDef, setFuncDef] = useState<FuncDef | undefined>();
  const allowedColumns = useMemo(() => {
    if (!funcDef || !table) return undefined;
    return getColumnsAcceptedByFunction(funcDef, table.columns);
  }, [funcDef, table]);

  const [column, setColumn] = useState<ValidatedColumnInfo | undefined>();
  const [name, setName] = useState("");
  useEffect(() => {
    if (!funcDef) {
      return;
    }
    const name = column ? `${funcDef.label}(${column.name})` : funcDef.label;
    setName(name);
  }, [funcDef, column]);

  const addColumn = useCallback(
    (column: ValidatedColumnInfo | undefined, funcDef: FuncDef) => {
      const { outType } = funcDef;
      const outInfo = outType === "sameAsInput" ? column : outType;
      if (!outInfo) {
        throw new Error(
          "Cannot determine output data type for the computed column",
        );
      }
      onAddColumn({
        name,
        show: true,
        computedConfig: {
          ...pickKeys(outInfo, ["tsDataType", "udt_name"]),
          funcDef,
          column: column?.name,
        },
      });
    },
    [onAddColumn, name],
  );

  if (!table) return <>Table not found {tableName}</>;

  return (
    <FlexCol data-command="QuickAddComputedColumn">
      <p className="m-0 ta-left">
        A computed column is a column that is calculated based on other data
        from the table.
        <br></br>
        It will not be stored in the database but will be calculated on the fly
        when queried.
      </p>
      {funcDef ?
        <Btn
          style={{ minWidth: "50px" }}
          label={{ label: "Function", variant: "normal", className: "mb-p25" }}
          variant="faded"
          color="action"
          iconPath={funcDef.isAggregate ? mdiSigma : mdiFunction}
          onClick={() => {
            setFuncDef(undefined);
          }}
        >
          {funcDef.label}
        </Btn>
      : <FunctionSelector
          column={undefined}
          wColumns={undefined}
          tableColumns={table.columns}
          onSelect={(funcDef) => {
            setFuncDef(funcDef);
          }}
        />
      }
      {allowedColumns && funcDef ?
        <>
          {column ?
            <Btn
              style={{ minWidth: "50px" }}
              label={{
                label: "Column",
                variant: "normal",
                className: "mb-p25",
              }}
              variant="faded"
              color="action"
              onClick={() => {
                setColumn(undefined);
              }}
            >
              {column.label || column.name}
            </Btn>
          : <SearchList
              id="cols-select"
              label="Applicable columns"
              className="f-1"
              items={allowedColumns.map((c) => ({
                ...getColumnListItem(c),
                onPress: () => {
                  setColumn(c);
                },
              }))}
            />
          }
        </>
      : null}

      {funcDef && (
        <FormField
          label="Computed column name"
          value={name}
          onChange={setName}
        />
      )}

      <FlexRow>
        <Btn onClick={() => onAddColumn(undefined)}>{t.common.Cancel}</Btn>
        <Btn
          {...{
            variant: "filled",
            color: "action",
            ...(!funcDef ?
              {
                disabledInfo: "Must select a function",
              }
            : allowedColumns && !column ?
              {
                disabledInfo: "Must select a column",
              }
            : {
                onClick: () => {
                  addColumn(column, funcDef);
                },
              }),
          }}
        >
          {t.common.Add}
        </Btn>
      </FlexRow>
    </FlexCol>
  );
};
