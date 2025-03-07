import { mdiDotsHorizontal } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { appTheme, useReactiveState } from "../../../../App";
import { ExpandSection } from "../../../../components/ExpandSection";
import { FlexCol, FlexRowWrap } from "../../../../components/Flex";
import { FormFieldDebounced } from "../../../../components/FormField/FormFieldDebounced";
import { InfoRow } from "../../../../components/InfoRow";
import Select from "../../../../components/Select/Select";
import type {
  DBSchemaTablesWJoins,
  WindowSyncItem,
} from "../../../Dashboard/dashboardUtils";
import { SmartFilterBar } from "../../../SmartFilterBar/SmartFilterBar";
import type { ColumnConfigWInfo } from "../../W_Table";
import { getColWInfo } from "../../tableUtils/getColWInfo";
import type { ColumnConfig } from "../ColumnMenu";
import { JoinPathSelectorV2, getAllJoins } from "../JoinPathSelectorV2";
import { LinkedColumnFooter } from "./LinkedColumnFooter";
import { LinkedColumnSelect } from "./LinkedColumnSelect";
import { t } from "../../../../i18n/i18nUtils";

export type LinkedColumnProps = {
  tables: DBSchemaTablesWJoins;
  db: DBHandlerClient;
  w: WindowSyncItem<"table">;
  column: ColumnConfigWInfo | undefined;
  onClose: VoidFunction | undefined;
};

const JOIN_TYPES = [
  {
    key: "inner",
    label: "Inner join",
    subLabel: "Will discard parent rows without a matching record",
  },
  {
    key: "left",
    label: "Left join",
    subLabel: "Will keep parent rows without a matching record",
  },
] as const;

export const NESTED_COLUMN_DISPLAY_MODES = [
  { key: "row", label: t.LinkedColumn["Row"] },
  { key: "column", label: t.LinkedColumn["Column"] },
  { key: "no-headers", label: t.LinkedColumn["No headers"] },
] as const;

export const LinkedColumn = (props: LinkedColumnProps) => {
  const { w, tables, db } = props;
  const { state: theme } = useReactiveState(appTheme);
  const getCol = (name: string) => w.columns?.find((c) => c.name === name);

  const [localColumn, setLocalColumn] = useState<ColumnConfigWInfo>();
  const currentColumn = localColumn ?? props.column;
  const table = useMemo(() => {
    const currentTargetPath =
      currentColumn?.nested &&
      getAllJoins({
        tableName: w.table_name,
        tables,
        value: currentColumn.nested.path,
      }).targetPath;
    return currentTargetPath?.table;
  }, [currentColumn, tables, w.table_name]);
  const newColumnNameError =
    !props.column && currentColumn && getCol(currentColumn.name) ?
      t.LinkedColumn["Column name already used. Change to another"]
    : undefined;

  const updateColumn = useCallback(
    (newCol: Partial<ColumnConfig>) => {
      if (!currentColumn) throw "Cannot update a column that does not exist";
      setLocalColumn({ ...currentColumn, ...newCol });
    },
    [currentColumn],
  );

  const updateNested = (newNested: Partial<ColumnConfig["nested"]>) => {
    if (!currentColumn) throw "Cannot update a column that does not exist";
    return updateColumn({ nested: { ...currentColumn.nested!, ...newNested } });
  };

  const nestedColumns = currentColumn?.nested?.columns;
  const disabledInfo =
    newColumnNameError ??
    (!nestedColumns?.filter((c) => c.show).length ?
      t.LinkedColumn["Must select columns"]
    : !props.column?.nested && !currentColumn ?
      t.LinkedColumn["Must select a table"]
    : undefined);

  useEffect(() => {
    if (!localColumn) return;
    const shownCols = localColumn.nested?.columns.filter((c) => c.show) ?? [];
    const width = shownCols.length > 2 || table?.info.isFileTable ? 250 : 150;
    if (localColumn.width !== width) {
      setLocalColumn({ ...localColumn, width });
    }
  }, [localColumn, table]);

  return (
    <FlexCol className="LinkedColumn gap-2">
      <InfoRow color="info" variant="naked" className=" " iconPath="">
        {
          t.LinkedColumn[
            "Join to and show data from tables that are related through a"
          ]
        }
        <a
          className="ml-p25"
          href="https://www.postgresql.org/docs/current/tutorial-fk.html"
          target="_blank"
        >
          FOREIGN KEY
        </a>
      </InfoRow>
      {currentColumn && (
        <FormFieldDebounced
          id="nested-col-name"
          label={t.LinkedColumn["Column label"]}
          value={currentColumn.name}
          error={newColumnNameError}
          onChange={(newColName) => {
            updateColumn({ name: newColName });
          }}
        />
      )}
      <FlexRowWrap className="ai-end gap-p25">
        <JoinPathSelectorV2
          tableName={w.table_name}
          tables={tables}
          value={currentColumn?.nested?.path}
          onChange={(targetPath, multiJoin) => {
            let colName = targetPath.table.name;
            if (multiJoin) {
              const distinctLeftCols = Array.from(
                new Set(multiJoin.value.flatMap((d) => d.map((_d) => _d[0]))),
              );
              const distinctRightCols = Array.from(
                new Set(multiJoin.value.flatMap((d) => d.map((_d) => _d[1]))),
              );
              /** If one of the groups has two distinct cols */
              if (distinctLeftCols.length * distinctRightCols.length === 2) {
                const chosenDifferentColname =
                  distinctLeftCols.length > 1 ?
                    multiJoin.chosen[0]![0]
                  : multiJoin.chosen[0]![1];
                colName = `${chosenDifferentColname}_${targetPath.table.name}`;
              }
            }
            const newColName = getCol(colName) ? `${colName} (1)` : colName;

            const { table } = targetPath;
            /**
             * Show first 5 cols to improve performance
             * If fileTable show all columns to ensure the images/media preview works
             */
            const nestedColumns = getColWInfo([table], {
              table_name: table.name,
              columns: null,
            }).map((c, i) => ({
              ...c,
              show: !!table.info.isFileTable || i < 5,
            }));
            const newCol: ColumnConfig = {
              name: newColName,
              show: true,
              width: 250,
              nested: {
                columns: nestedColumns,
                path: targetPath.path,
                joinType: "left",
                limit: 20,
              },
            };
            setLocalColumn(newCol);
          }}
        />
      </FlexRowWrap>
      <LinkedColumnSelect
        {...props}
        updateNested={updateNested}
        updateColumn={updateColumn}
        table={table}
        currentColumn={currentColumn}
      />
      {currentColumn && (
        <>
          <ExpandSection
            iconPath={mdiDotsHorizontal}
            label={t.LinkedColumn["More options"]}
          >
            {currentColumn.nested && (
              <FlexRowWrap className="ai-end">
                <Select
                  label={t.LinkedColumn["Layout"]}
                  fullOptions={NESTED_COLUMN_DISPLAY_MODES}
                  disabledInfo={
                    currentColumn.nested.chart ?
                      t.LinkedColumn["Must disable chart first"]
                    : undefined
                  }
                  value={currentColumn.nested.displayMode}
                  onChange={(displayMode) => {
                    updateNested({ displayMode });
                  }}
                />
              </FlexRowWrap>
            )}
            <FlexRowWrap>
              <Select
                label={t.LinkedColumn["Join type"]}
                value={currentColumn.nested?.joinType}
                fullOptions={JOIN_TYPES}
                onChange={(joinType) => {
                  updateNested({ joinType });
                }}
              />
              {currentColumn.nested && (
                <FormFieldDebounced
                  id="nested-col-limit"
                  label={t.W_SQLBottomBar.Limit}
                  optional={true}
                  value={currentColumn.nested.limit}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 1,
                    max: 30,
                  }}
                  onChange={(limit) => {
                    updateNested({
                      limit:
                        limit && Number.isFinite(+limit) ? +limit : undefined,
                    });
                  }}
                />
              )}
            </FlexRowWrap>

            {table && currentColumn.nested && (
              <>
                <SmartFilterBar
                  theme={theme}
                  innerClassname="mt-1 px-0"
                  filter={currentColumn.nested.detailedFilter}
                  having={currentColumn.nested.detailedHaving}
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
                  onSortChange={(sort) => updateNested({ sort })}
                  onChange={(detailedFilter) =>
                    updateNested({ detailedFilter })
                  }
                  onHavingChange={(detailedHaving) =>
                    updateNested({ detailedHaving })
                  }
                />
              </>
            )}
          </ExpandSection>
        </>
      )}

      <LinkedColumnFooter
        {...props}
        localColumn={localColumn}
        disabledInfo={disabledInfo}
      />
    </FlexCol>
  );
};
