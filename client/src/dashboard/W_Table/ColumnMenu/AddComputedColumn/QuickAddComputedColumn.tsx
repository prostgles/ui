import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { mdiFunction, mdiSigma } from "@mdi/js";
import React from "react";
import { t } from "src/i18n/i18nUtils";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnConfig } from "../ColumnMenu";
import { FunctionSelector } from "../FunctionSelector/FunctionSelector";
import { FunctionColumnList } from "./FunctionColumnList";
import { useAddComputedColumnState } from "./useAddComputedColumn";

export type QuickAddComputedColumnProps = {
  tables: DBSchemaTablesWJoins;
  tableName: string;
  onAddColumn: (newColumn: ColumnConfig | undefined) => void;
};

export const QuickAddComputedColumn = ({
  tableName,
  tables,
  onAddColumn,
}: QuickAddComputedColumnProps) => {
  const state = useAddComputedColumnState({ tables, tableName, onAddColumn });
  const {
    table,
    allowedColumns,
    column,
    funcDef,
    name,
    setColumn,
    setFuncDef,
    setName,
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
            autoFocus: true,
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
          {t.AddColumnMenu["Add Computed Field"]}
        </Btn>
      </FlexRow>
    </FlexCol>
  );
};
