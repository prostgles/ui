import React, { useCallback, useMemo, useState } from "react";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import PopupMenu from "../../../../components/PopupMenu";
import { FlexCol } from "../../../../components/Flex";
import Btn from "../../../../components/Btn";
import { mdiFunction, mdiSigma } from "@mdi/js";
import { type FuncDef, FunctionSelector } from "../FunctionSelector";
import { getFuncDefColumns } from "./AddComputedColMenu";
import SearchList from "../../../../components/SearchList/SearchList";
import { getColumnListItem } from "../ColumnsMenu";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import type { ColumnConfig } from "../ColumnMenu";

type P = {
  tables: DBSchemaTablesWJoins;
  tableName: string;
  onAddColumn: (newColumn: ColumnConfig) => void;
};
export const QuickAddComputedColumn = ({
  tableName,
  tables,
  onAddColumn,
}: P) => {
  const table = useMemo(
    () => tables.find((t) => t.name === tableName),
    [tables, tableName],
  );
  const [funcDef, setFuncDef] = React.useState<FuncDef | undefined>();
  const [allowedColumns, setAllowedColumns] = useState<
    ValidatedColumnInfo[] | undefined
  >();

  const addColumn = useCallback(
    (
      c: ValidatedColumnInfo | undefined,
      funcDef: FuncDef,
      pClose: VoidFunction,
    ) => {
      const name = c ? `${funcDef.label}(${c.name})` : funcDef.label;
      onAddColumn({
        name,
        show: true,
        computedConfig: {
          funcDef,
          column: c?.name,
        },
      });
      setFuncDef(undefined);
      setAllowedColumns(undefined);
      pClose();
    },
    [onAddColumn],
  );

  if (!table) return <>Table not found {tableName}</>;

  return (
    <PopupMenu
      contentClassName="p-0"
      title="Add computed column"
      data-command="QuickAddComputedColumn"
      button={
        <Btn
          variant="faded"
          iconPath={mdiSigma}
          data-command="QuickAddComputedColumn"
        >
          Row count/Aggregate
        </Btn>
      }
      render={(pClose) => (
        <FlexCol className="">
          <p className="m-0 p-1 ta-left">
            A computed column is a column that is calculated based on other data
            from the table.
            <br></br>
            It will not be stored in the database but will be calculated on the
            fly when queried.
          </p>
          {allowedColumns && funcDef ?
            <>
              <FlexCol className="p-1">
                <Btn
                  className="mt-p5"
                  style={{ minWidth: "50px" }}
                  label={{ label: "Function" }}
                  variant="faded"
                  color="action"
                  iconPath={funcDef.isAggregate ? mdiSigma : mdiFunction}
                  onClick={() => {
                    setFuncDef(undefined);
                  }}
                >
                  {funcDef.label}
                </Btn>
              </FlexCol>
              <SearchList
                label="Columns"
                id="cols-elect"
                style={{ margin: ".4em" }}
                className=" f-1"
                // label={`Columns for ${funcDef.label}`}
                items={allowedColumns.map((c) => ({
                  ...getColumnListItem(c),
                  onPress: () => {
                    addColumn(c, funcDef, pClose);
                  },
                }))}
              />
            </>
          : <FunctionSelector
              column={undefined}
              wColumns={undefined}
              tableColumns={table.columns}
              onSelect={(funcDef) => {
                if (!funcDef) return;
                const allowedCols = getFuncDefColumns(funcDef, table.columns);
                if (!allowedCols) {
                  addColumn(undefined, funcDef, pClose);
                  return;
                }
                setFuncDef(funcDef);
                setAllowedColumns(allowedCols);
              }}
            />
          }
        </FlexCol>
      )}
    />
  );
};
