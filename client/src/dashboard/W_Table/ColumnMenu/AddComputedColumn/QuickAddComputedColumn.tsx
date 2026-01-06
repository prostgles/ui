import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { mdiFunction, mdiSigma } from "@mdi/js";
import React from "react";
import { t } from "src/i18n/i18nUtils";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type { ColumnConfigWInfo } from "../../W_Table";
import type { ColumnConfig } from "../ColumnMenu";
import { FunctionExtraArguments } from "../FunctionSelector/FunctionExtraArguments";
import { FunctionSelector } from "../FunctionSelector/FunctionSelector";
import { FunctionColumnList } from "./FunctionColumnList";
import { useAddComputedColumnState } from "./useAddComputedColumn";

export type QuickAddComputedColumnProps = {
  tableName: string;
  existingColumn: ColumnConfigWInfo | undefined;
  onAddColumn: (newColumn: ColumnConfig | undefined) => void;
};

export const QuickAddComputedColumn = ({
  tableName,
  onAddColumn,
  existingColumn,
}: QuickAddComputedColumnProps) => {
  const state = useAddComputedColumnState({
    tableName,
    onAddColumn,
    existingColumn,
  });
  const { db } = usePrgl();
  const {
    table,
    allowedColumns,
    column,
    funcDef,
    name,
    setColumn,
    setFuncDef,
    setName,
    args,
    setArgs,
  } = state;

  if (!table) return <>Table not found {tableName}</>;

  return (
    <FlexCol data-command="QuickAddComputedColumn" className="min-h-0 gap-2">
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

      {funcDef?.requiresArg && (
        <FunctionExtraArguments
          argName={funcDef.requiresArg}
          args={args}
          onChange={setArgs}
          columnName={undefined}
          db={db}
          table={table}
        />
      )}

      {allowedColumns && funcDef && (
        <FunctionColumnList
          allowedColumns={allowedColumns}
          column={column}
          onChange={setColumn}
          setIncludeJoins={state.setIncludeJoins}
          includeJoins={state.includeJoins}
        />
      )}

      {!state.onAddDisabledInfo && (
        <FormField
          label="Computed column name"
          value={name}
          inputProps={{
            autoFocus: !funcDef?.requiresArg,
            "data-command": "QuickAddComputedColumn.name",
          }}
          onChange={setName}
        />
      )}

      <FlexRow className="mt-1">
        <Btn onClick={() => onAddColumn(undefined)}>{t.common.Cancel}</Btn>
        <Btn
          variant="filled"
          color="action"
          data-command="QuickAddComputedColumn.Add"
          disabledInfo={state.onAddDisabledInfo}
          onClick={state.onAdd}
        >
          {existingColumn ?
            t.common.Update
          : t.AddColumnMenu["Add Computed Field"]}
        </Btn>
      </FlexRow>
    </FlexCol>
  );
};
