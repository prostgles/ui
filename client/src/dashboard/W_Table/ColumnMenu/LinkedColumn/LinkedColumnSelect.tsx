import { mdiPlus } from "@mdi/js";
import React, { useState } from "react";
import { WithPrgl } from "../../../../WithPrgl";
import Btn from "../../../../components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../../components/Flex";
import { Label } from "../../../../components/Label";
import PopupMenu from "../../../../components/PopupMenu";
import { AddComputedColMenu } from "../AddComputedColumn/AddComputedColMenu";
import { QuickAddComputedColumn } from "../AddComputedColumn/QuickAddComputedColumn";
import { ColumnList } from "../ColumnList";
import { NestedTimechartControls } from "../NestedTimechartControls";
import type { ColumnConfig } from "../ColumnMenu";
import type { LinkedColumnProps } from "./LinkedColumn";
import type { ColumnConfigWInfo } from "../../W_Table";
import { getColWInfo } from "../../tableUtils/getColWInfo";
import { getMinimalColumnInfo } from "../../tableUtils/tableUtils";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";

type P = LinkedColumnProps & {
  updateNested: (newNested: Partial<ColumnConfig["nested"]>) => void;
  table: DBSchemaTablesWJoins[number] | undefined;
  currentColumn: ColumnConfigWInfo | undefined;
  updateColumn: (newCol: Partial<ColumnConfig>) => void;
};
export const LinkedColumnSelect = ({
  tables,
  w,
  db,
  table,
  currentColumn,
  column,
  updateNested,
  updateColumn,
}: P) => {
  const nestedColumns = currentColumn?.nested?.columns;
  const updateNestedColumns = (newCols: ColumnConfigWInfo[]) => {
    if (!table) throw "not ok";
    updateNested({
      columns: getMinimalColumnInfo(
        getColWInfo(tables, { table_name: table.name, columns: newCols }),
      ),
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
                <WithPrgl
                  onRender={(prgl) => (
                    <ColumnList
                      columns={nestedColumns}
                      tableColumns={table.columns}
                      mainMenuProps={{
                        db,
                        onClose: pClose,
                        suggestions: undefined,
                        table,
                        tables,
                        w,
                        prgl,
                      }}
                      onChange={updateNestedColumns}
                    />
                  )}
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
            tables={tables}
          />
          <div className="py-p75">OR</div>
          <QuickAddComputedColumn
            tables={tables}
            tableName={table.name}
            onAddColumn={(newCol) => {
              const oldHiddenCols = (nestedColumns ?? []).map((c) => ({
                ...c,
                show: false,
              }));
              const newCols = [newCol, ...oldHiddenCols];
              updateNested({ displayMode: "no-headers", columns: newCols });
            }}
          />
        </>
      )}
    </FlexRowWrap>
  );
};
