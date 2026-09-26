import Btn from "@components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { Label } from "@components/Label";
import PopupMenu from "@components/PopupMenu";
import { mdiPlus, mdiSigma } from "@mdi/js";
import React, { useState } from "react";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import { getColumnsWithInfo } from "../../tableUtils/getColumnsWithInfo";
import { getMinimalColumnInfo } from "../../tableUtils/tableUtils";
import { AddComputedColMenu } from "../AddComputedColumn/AddComputedColMenu";
import { QuickAddComputedColumn } from "../AddComputedColumn/QuickAddComputedColumn";
import { ColumnList } from "../ColumnList";
import type { ColumnConfig, ColumnConfigNested, NestedColumn } from "../ColumnConfig";
import { NestedTimechartControls } from "../NestedTimechartControls";
import type { LinkedColumnProps } from "./LinkedColumn";

type P = LinkedColumnProps & {
  updateNested: (newNested: Partial<ColumnConfigNested["nested"]>) => void;
  table: DBSchemaTableWithRenderInfo | undefined;
  currentColumn: ColumnConfigNested | undefined;
  updateColumn: (newCol: Partial<ColumnConfigNested>) => void;
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
  const nestedColumns = currentColumn?.nested.columns;
  const updateNestedColumns = (newCols: ColumnConfig[]) => {
    if (!table) throw "not ok";
    updateNested({
      columns: getMinimalColumnInfo(
        getColumnsWithInfo(table.name, tables, newCols),
      ) as NestedColumn<ColumnConfig>[],
    });
  };
  const [showAddComputedCol, setShowAddComputedCol] = useState(false);

  return (
    <FlexRowWrap className="ai-end">
      {nestedColumns && table && (
        <PopupMenu
          data-command="LinkedColumn.ColumnListMenu"
          title="Select columns"
          contentClassName="f-1 min-h-0 o-hidden"
          clickCatchStyle={{ opacity: 0.1 }}
          positioning="beneath-left"
          button={
            <FlexCol className="gap-p25 min-h-0">
              <Label label="Columns" variant="normal"></Label>
              <Btn
                variant="faded"
                color={
                  currentColumn.nested.display?.type !== "timechart" ?
                    "action"
                  : undefined
                }
                data-command="LinkedColumn.ColumnList.toggle"
                disabledInfo={
                  currentColumn.nested.display?.type === "timechart" ?
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
              <FlexCol className="min-h-0">
                <ColumnList
                  parentDisplay={currentColumn.nested.display?.type ?? "values"}
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
            chart={
              currentColumn?.nested.display?.type === "timechart" ?
                currentColumn.nested.display
              : undefined
            }
            onChange={(chart) => {
              updateNested({
                display: chart ?? { type: "values" },
                limit: chart ? 200 : 20,
                sort: chart ? { key: "date", asc: true } : undefined,
              });
            }}
          />
          <div className="py-p5">OR</div>

          <PopupMenu
            contentClassName="p-1 flex-col gap-1"
            title="Add computed column"
            positioning="beneath-left"
            data-command="QuickAddComputedColumn"
            button={
              <Btn variant="faded" iconPath={mdiSigma}>
                Row count/Aggregate
              </Btn>
            }
            render={(popupClose) => (
              <QuickAddComputedColumn
                tableName={table.name}
                existingColumn={undefined}
                onAddColumn={(newCol) => {
                  popupClose();
                  if (!newCol) {
                    return;
                  }
                  const newColumnName = getUniqueColumnName(
                    newCol.name,
                    nestedColumns ?? [],
                  );
                  const oldColumns = (nestedColumns ?? []).map((c) => ({
                    ...c,
                    show: !!c.show && !!c.computedConfig?.funcDef.isAggregate,
                  }));
                  const newCols = [
                    {
                      ...newCol,
                      name: newColumnName,
                    },
                    ...oldColumns,
                  ];
                  updateNested({
                    display: { type: "values", labels: "none" },
                    columns: newCols as NestedColumn<ColumnConfig>[],
                  });
                }}
              />
            )}
          />
        </>
      )}
    </FlexRowWrap>
  );
};

const getUniqueColumnName = (
  requestedName: string,
  columns: Pick<ColumnConfig, "name">[],
) => {
  if (!columns.some(({ name }) => name === requestedName)) return requestedName;

  let suffix = 2;
  while (columns.some(({ name }) => name === `${requestedName} (${suffix})`)) {
    suffix++;
  }
  return `${requestedName} (${suffix})`;
};
