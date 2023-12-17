import { mdiDotsHorizontal, mdiHelp, mdiPlus } from "@mdi/js";
import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useCallback, useMemo, useState } from "react";
import { themeR } from "../../../../App";
import Btn from "../../../../components/Btn";
import { ExpandSection } from "../../../../components/ExpandSection";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../../components/Flex";
import { FormFieldDebounced } from "../../../../components/FormField/FormFieldDebounced";
import { InfoRow } from "../../../../components/InfoRow";
import { Label } from "../../../../components/Label";
import PopupMenu from "../../../../components/PopupMenu";
import Select from "../../../../components/Select/Select";
import CodeExample from "../../../CodeExample";
import { DBSchemaTablesWJoins, WindowSyncItem } from "../../../Dashboard/dashboardUtils";
import { useReactiveState } from "../../../ProstglesMethod/hooks";
import SmartFilterBar from "../../../SmartFilter/SmartFilterBar";
import { ColumnConfigWInfo } from "../../W_Table";
import { getColWInfo } from "../../tableUtils/getColWInfo";
import { AddComputedColMenu } from "../AddComputedColMenu";
import { ColumnList } from "../ColumnList";
import { ColumnConfig } from "../ColumnMenu";
import { JoinPathSelectorV2, getAllJoins } from "../JoinPathSelectorV2";
import { NestedTimechartControls } from "../NestedTimechartControls";
import { LinkedColumnFooter } from "./LinkedColumnFooter";

export type LinkedColumnProps = {
  tables: DBSchemaTablesWJoins;
  db: DBHandlerClient;
  w: WindowSyncItem<"table">;
  column: ColumnConfigWInfo | undefined;
  onClose: VoidFunction | undefined;
};

const JOIN_TYPES = [
  { key: "inner", label: "Inner join", subLabel: "Will discard parent rows without a matching record" },
  { key: "left", label: "Left join", subLabel: "Will keep parent rows without a matching record" }
] as const;

export const NESTED_COLUMN_DISPLAY_MODES = [
  { key: "row", label: "Row", },
  { key: "column", label: "Column", },
  { key: "no-headers", label: "No headers", },
] as const;


export const LinkedColumn = (props: LinkedColumnProps) => {
  const { w, tables, db } = props; 
  const { state: theme } = useReactiveState(themeR);
  const getCol = (name: string) => w.columns?.find(c => c.name === name)

  const [localColumn, setLocalColumn] = useState<ColumnConfigWInfo>();
  const currentColumn = localColumn ?? props.column;
  const currentTargetPath = currentColumn?.nested && getAllJoins({ tableName: w.table_name, tables, value: currentColumn.nested.path }).targetPath;
  const table = currentTargetPath?.table;
  const newColumnNameError = !props.column && currentColumn && getCol(currentColumn.name)? "Column name already used. Change to another" : undefined;

  const updateColumn = useCallback((newCol: Partial<ColumnConfig>) => {
    if(!currentColumn) throw "Cannot update a column that does not exist";
    setLocalColumn({ ...currentColumn, ...newCol });
  }, [currentColumn]);

  const updateNested = (newNested: Partial<ColumnConfig["nested"]>) => {
    if(!currentColumn) throw "Cannot update a column that does not exist";
    return updateColumn({ nested: { ...(currentColumn).nested!,  ...newNested } })
  };

  const updateNestedColumns = (newCols: ColumnConfigWInfo[]) => {
    if(!table) throw "not ok"
    updateNested({
      columns: getColWInfo(tables, { table_name: table.name, columns: newCols })
    });
  }
  const [showAddComputedCol, setShowAddComputedCol] = useState(false);
  const nestedColumns = currentColumn?.nested?.columns
  const disabledInfo = newColumnNameError ?? (!nestedColumns?.filter(c => c.show).length? "Must select columns" : !props.column?.nested && !currentColumn? "Must select a table" : undefined);

  const nestedColumnQuery = useMemo(() => {
    const { nested } = currentColumn ?? {};
    if(!currentColumn || !nested) return;
    const asName = v => JSON.stringify(v);
    const rootTable = asName(w.table_name);
    return [
      `SELECT ${rootTable}.*, ${asName(currentColumn.name)}.*`,
      `FROM ${rootTable}`,
      ...nested.path
        .map((path, index) => 
          `${nested.joinType === "inner"? "INNER" : "LEFT"} JOIN ${asName(path.table)} \n  ON ${path.on.map(on => Object.entries(on).map(([k, v]) => {
            const prevTable = !index? rootTable : asName(nested.path[index - 1]?.table);
            return `${prevTable}.${k} = ${asName(path.table)}.${v}`
          })).join(" AND ")}`),
    ].join("\n");
  }, [currentColumn]);

  return <FlexCol className="LinkedColumn">
    <InfoRow color="info" variant="naked" className="mb-1" iconPath="">
      Join to and show data from tables that are related through a 
      <a className="ml-p25" href="https://www.postgresql.org/docs/current/tutorial-fk.html" target="_blank">FOREIGN KEY</a> 
    </InfoRow>
    {currentColumn && 
      <FormFieldDebounced 
        id="nested-col-name"
        label={"Column label"} 
        value={currentColumn.name}
        error={newColumnNameError}
        onChange={newColName => {
          updateColumn({ name: newColName });
        }} 
      />
    }
    <FlexRowWrap className="ai-end">
      <JoinPathSelectorV2
        tableName={w.table_name}
        tables={tables}
        value={currentColumn?.nested?.path}
        onChange={(targetPath, multiJoin) => {
 
          let colName = targetPath.table.name;
          if(multiJoin){
            const distinctLeftCols = Array.from(new Set(multiJoin.value.flatMap(d => d.map(_d => _d[0]))));
            const distinctRightCols = Array.from(new Set(multiJoin.value.flatMap(d => d.map(_d => _d[1]))));
            /** If one of the groups has two distinct cols */
            if(distinctLeftCols.length * distinctRightCols.length === 2){
              const chosenDifferentColname = distinctLeftCols.length > 1? multiJoin.chosen[0]![0] : multiJoin.chosen[0]![1]
              colName = `${chosenDifferentColname}_${targetPath.table.name}`
            }
          }
          const newColName = getCol(colName)? `${colName} (1)` : colName;

          const { table } = targetPath;
          const newCol: ColumnConfig = {
            name: newColName,
            show: true,
            width: 250,
            nested: {
              /** 
               * Show first 5 cols to improve performance
               * If fileTable show all columns to ensure the images/media preview works
               */
              columns: getColWInfo([table], { table_name: table.name, columns: null }).map((c, i) => ({ ...c, show: !!table.info.isFileTable || i < 5 })),
              path: targetPath.path,
              joinType: "left",
              limit: 20,
            }
          };
          setLocalColumn(newCol);
        }}    
      />
      {nestedColumnQuery && <PopupMenu 
        title="Nested column join details"
        positioning="center"
        button={<Btn iconPath={mdiHelp}/>} 
        render={() => 
          <CodeExample 
            language="sql" 
            value={nestedColumnQuery} 
            style={{ minWidth: "450px", minHeight: "250px" }} 
          />
        }
      />}
    </FlexRowWrap>
    <FlexRowWrap className="ai-end">
      {nestedColumns && table &&
        <PopupMenu 
          data-command="LinkedColumn.ColumnListMenu"
          title="Select columns"
          contentClassName=""
          clickCatchStyle={{ opacity: .1 }}
          positioning="beneath-left"
          button={
            <FlexCol className="gap-p25">
              <Label label="Columns" variant="normal"></Label>
              <Btn variant="faded"  data-command="LinkedColumn.ColumnList.toggle" disabledInfo={currentColumn.nested?.chart? "Must disable time chart first" : undefined}>
                {nestedColumns.filter(c => c.show).length} selected
              </Btn>
            </FlexCol>
          }
          render={(pClose) => {
            return <FlexCol>
              <ColumnList 
                columns={nestedColumns}
                tableColumns={table.columns}
                // mainMenuProps={undefined}
                mainMenuProps={{ db, onClose: pClose, suggestions: undefined, table, tables, w }}
                onChange={updateNestedColumns}
              />

              <FlexRow className="p-1">
                {/* <Btn 
                  iconPath={mdiPlus}
                  variant="faded" 
                  color="action"
                  disabledInfo={nestedColumns.some(c => c.computedConfig?.funcDef.key === "$countAll")? "Already added" : undefined }
                  onClick={() => {
                    const newCols: ColumnConfigWInfo[] = [
                      {
                        name: "Count of all rows",
                        show: true,
                        computedConfig: { 
                          column: undefined,
                          funcDef: { key: "$countAll", outType: { tsDataType: "number", udt_name: "int8" }, label: "Count all", subLabel: "", tsDataTypeCol: undefined, udtDataTypeCol: undefined },
                        }
                      },
                      ...nestedColumns.map(c => ({ ...c, show: false }))
                    ];
                    updateNestedColumns(newCols)
                  }}
                >
                  Show count of all rows
                </Btn> */}
                <Btn 
                  variant="faded"
                  iconPath={mdiPlus} 
                  color="action" 
                  onClick={() => setShowAddComputedCol(true)}
                >
                  Add computed column
                </Btn>
                {showAddComputedCol && 
                  <AddComputedColMenu 
                    db={db}
                    nestedColumnName={currentColumn.name}
                    tables={tables}
                    w={w}
                    onClose={() => setShowAddComputedCol(false)}
                  />
                }
              </FlexRow>
            </FlexCol>
          }}
        />
      }
      {table && 
        <NestedTimechartControls
          tableName={table.name} 
          chart={currentColumn?.nested?.chart} 
          onChange={chart => {
            updateNested({ chart, limit: chart? 200 : 20 });
          }} 
          tables={tables} 
        />
      }
      
    </FlexRowWrap>
    {currentColumn && <>
      <ExpandSection iconPath={mdiDotsHorizontal} label="More options">

        {currentColumn.nested && <FlexRowWrap className="ai-end">
          <Select 
            label={"Layout"}
            fullOptions={NESTED_COLUMN_DISPLAY_MODES}
            disabledInfo={currentColumn.nested.chart? "Must disable chart first" : undefined}
            value={currentColumn.nested.displayMode}
            onChange={displayMode => {
              updateNested({ displayMode });
            }}
          />
        </FlexRowWrap>}
        <FlexRowWrap>
          <Select 
            label={"Join type"}
            value={currentColumn.nested?.joinType}
            fullOptions={JOIN_TYPES}
            onChange={joinType => { 
              updateNested({ joinType });
            }}
          />
          {currentColumn.nested && <FormFieldDebounced 
            id="nested-col-limit"
            label={"Limit"} 
            optional={true}
            value={currentColumn.nested.limit} 
            type="number"
            inputProps={{
              min: 0,
              step: 1,
              max: 30,
            }}
            onChange={limit => {
              updateNested({ limit: limit && Number.isFinite(+limit)? +limit : undefined })
            }}
          />}

        </FlexRowWrap>

        {table && currentColumn.nested &&
          <>
            <SmartFilterBar 
              theme={theme}
              innerClassname="mt-1 px-0"
              filter={currentColumn.nested.detailedFilter}
              table_name={table.name} 
              db={db} 
              tables={tables}
              columns={currentColumn.nested.columns}
              rowCount={-1}
              methods={{}}
              showInsertUpdateDelete={{ 
                showupdate: false, 
                showdelete: false,
                showinsert: false,
              }}
              sort={currentColumn.nested.sort}
              onSortChange={sort => updateNested({ sort })}
              onChange={detailedFilter => updateNested({ detailedFilter })} 
            />
          </>
        }
      </ExpandSection>
    </>
    }


    <LinkedColumnFooter { ...props } localColumn={localColumn} disabledInfo={disabledInfo} />
  </FlexCol>
}