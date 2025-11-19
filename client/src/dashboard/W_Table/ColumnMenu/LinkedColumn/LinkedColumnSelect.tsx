import Btn from "@components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { Label } from "@components/Label";
import PopupMenu from "@components/PopupMenu";
import { mdiPlus, mdiSigma } from "@mdi/js";
import React, { useState } from "react";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../../W_Table";
import { getColWInfo } from "../../tableUtils/getColWInfo";
import { getMinimalColumnInfo } from "../../tableUtils/tableUtils";
import { AddComputedColMenu } from "../AddComputedColumn/AddComputedColMenu";
import { QuickAddComputedColumn } from "../AddComputedColumn/QuickAddComputedColumn";
import { ColumnList } from "../ColumnList";
import type { ColumnConfig } from "../ColumnMenu";
import { NestedTimechartControls } from "../NestedTimechartControls";
import type { LinkedColumnProps } from "./LinkedColumn";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";

type P = LinkedColumnProps & {
  updateNested: (newNested: Partial<ColumnConfig["nested"]>) => void;
  table: DBSchemaTablesWJoins[number] | undefined;
  currentColumn: ColumnConfigWInfo | undefined;
  updateColumn: (newCol: Partial<ColumnConfig>) => void;
};
export const LinkedColumnSelect = ({
  w,
  table,
  currentColumn,
  column,
  updateNested,
  updateColumn,
}: P) => {
  const { tables, db } = usePrgl();
  const nestedColumns = currentColumn?.nested?.columns;
  const updateNestedColumns = (newCols: ColumnConfigWInfo[]) => {
    if (!table) throw "not ok";
    updateNested({
      columns: getMinimalColumnInfo(getColWInfo(table, newCols)),
    });
  };
  const [showAddComputedCol, setShowAddComputedCol] = useState(false);

  return (
    <FlexRowWrap className="ai-end">
      {nestedColumns && table && (
        <PopupMenu
          data-command="LinkedColumn.ColumnListMenu"
          title="Select columns"
          contentClassName=""
          clickCatchStyle={{ opacity: 0.1 }}
          positioning="beneath-left"
          button={
            <FlexCol className="gap-p25">
              <Label label="Columns" variant="normal"></Label>
              <Btn
                variant="faded"
                color={!currentColumn.nested?.chart ? "action" : undefined}
                data-command="LinkedColumn.ColumnList.toggle"
                disabledInfo={
                  currentColumn.nested?.chart ?
                    "Must disable time chart first"
                  : undefined
                }
              >
                {nestedColumns.filter((c) => c.show).length} selected
              </Btn>
            </FlexCol>
          }
          render={(pClose) => {
            return (
              <FlexCol>
                <ColumnList
                  columns={nestedColumns}
                  table={table}
                  onClose={pClose}
                  suggestions={undefined}
                  w={w}
                  onChange={updateNestedColumns}
                />

                <FlexRow className="p-1">
                  <Btn
                    variant="faded"
                    iconPath={mdiPlus}
                    color="action"
                    onClick={() => setShowAddComputedCol(true)}
                  >
                    Add computed column
                  </Btn>
                  {showAddComputedCol && (
                    <AddComputedColMenu
                      db={db}
                      nestedColumnOpts={
                        !column ?
                          {
                            type: "new",
                            config: currentColumn,
                            onChange: updateColumn,
                          }
                        : {
                            type: "existing",
                            config: currentColumn,
                          }
                      }
                      tables={tables}
                      w={w}
                      onClose={() => setShowAddComputedCol(false)}
                    />
                  )}
                </FlexRow>
              </FlexCol>
            );
          }}
        />
      )}
      {table && (
        <>
          <NestedTimechartControls
            tableName={table.name}
            chart={currentColumn?.nested?.chart}
            onChange={(chart) => {
              updateNested({ chart, limit: chart ? 200 : 20 });
            }}
          />
          <div className="py-p75">OR</div>

          <PopupMenu
            contentClassName="p-1 flex-col gap-1"
            title="Add computed column"
            positioning="beneath-left"
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
            render={(popupClose) => (
              <QuickAddComputedColumn
                tableName={table.name}
                existingColumn={undefined}
                onAddColumn={(newCol) => {
                  if (!newCol) {
                    popupClose();
                    return;
                  }
                  const oldHiddenCols = (nestedColumns ?? []).map((c) => ({
                    ...c,
                    show: false,
                  }));
                  const newCols = [newCol, ...oldHiddenCols];
                  updateNested({ displayMode: "no-headers", columns: newCols });
                }}
              />
            )}
          />
        </>
      )}
    </FlexRowWrap>
  );
};
