import { ExpandSection } from "@components/ExpandSection";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { InfoRow } from "@components/InfoRow";
import { Select } from "@components/Select/Select";
import { mdiDotsHorizontal } from "@mdi/js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import { t } from "../../../../i18n/i18nUtils";
import type { WindowSyncItem } from "../../../Dashboard/dashboardUtils";
import { SmartFilterBar } from "../../../SmartFilterBar/SmartFilterBar";
import type { ColumnConfigWithInfo } from "../../W_Table";
import { getColumnsWithInfo } from "../../tableUtils/getColumnsWithInfo";
import { getRequiredTableSelect } from "../../tableUtils/getTableSelect";
import type { ColumnConfig, ColumnConfigNested } from "../ColumnConfig";
import { getTableIdentityColumns } from "../ColumnDisplayFormat/getTableIdentityColumns";
import {
  getAllJoins,
  JoinPathSelectorV2,
  type JoinPathSelectorV2Props,
} from "../JoinPathSelectorV2";
import { LinkedColumnFooter } from "./LinkedColumnFooter";
import { LinkedColumnSelect } from "./LinkedColumnSelect";

export type LinkedColumnProps = {
  w: WindowSyncItem<"table">;
  column: ColumnConfigNested<ColumnConfigWithInfo> | undefined;
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

export const LinkedColumn = (props: LinkedColumnProps) => {
  const { w } = props;
  const { tables, db, sql } = usePrgl();
  const getCol = useCallback(
    (name: string) => w.columns?.find((c) => c.name === name),
    [w.columns],
  );

  const [localColumn, setLocalColumn] = useState<ColumnConfigNested>();
  const currentColumn = localColumn ?? props.column;
  const table = useMemo(() => {
    const currentTargetPath =
      currentColumn &&
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
    (newCol: Partial<ColumnConfigNested>) => {
      if (!currentColumn) throw "Cannot update a column that does not exist";
      setLocalColumn({ ...currentColumn, ...newCol });
    },
    [currentColumn],
  );

  const updateNested = (newNested: Partial<ColumnConfigNested["nested"]>) => {
    if (!currentColumn) throw "Cannot update a column that does not exist";
    return updateColumn({ nested: { ...currentColumn.nested, ...newNested } });
  };

  const nestedColumns = currentColumn?.nested.columns;
  const disabledInfo =
    newColumnNameError ??
    (!nestedColumns?.filter((c) => c.show).length ?
      t.LinkedColumn["Must select columns"]
    : !props.column && !currentColumn ?
      t.LinkedColumn["Must select a table"]
    : undefined);

  useEffect(() => {
    if (!localColumn) return;
    const shownCols = localColumn.nested.columns.filter((c) => c.show);
    const width = shownCols.length > 2 || table?.isFileTable ? 250 : 150;
    if (localColumn.width !== width) {
      setLocalColumn({ ...localColumn, width });
    }
  }, [localColumn, table]);

  const onJoinPathChange: JoinPathSelectorV2Props["onChange"] = useCallback(
    (targetPath, multiJoin) => {
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
      const identityColumns = getTableIdentityColumns(table);
      /**
       * Show the first 5 cols, identity columns and configured card fields
       */
      const initialNestedColumns = table.columns.map(
        (c, i) =>
          ({
            name: c.name,
            show:
              i < 5 ||
              identityColumns.some(({ name }) => name === c.name) ||
              [
                table.card?.avatarColumn,
                table.card?.headerColumn,
                table.card?.subHeaderColumn,
              ].includes(c.name),
          }) satisfies ColumnConfig,
      );
      const requiredSelect = getRequiredTableSelect(
        getColumnsWithInfo(table.name, tables, initialNestedColumns),
        table,
      );
      const nestedColumns = initialNestedColumns.map((column) => ({
        ...column,
        show: column.show || requiredSelect[column.name] !== undefined,
      }));
      const newCol: ColumnConfigNested = {
        name: newColName,
        show: true,
        width: 250,
        nested: {
          display: { type: "drillable-records" },
          columns: nestedColumns,
          path: targetPath.path,
          joinType: "left",
          limit: 20,
        },
      };
      setLocalColumn(newCol);
    },
    [getCol, tables],
  );

  return (
    <FlexCol
      data-command="LinkedColumn"
      className="LinkedColumn gap-2"
      style={{ maxWidth: "600px" }}
    >
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
          rel="noreferrer"
        >
          FOREIGN KEY
        </a>
      </InfoRow>
      {currentColumn && (
        <FormFieldDebounced
          id="nested-col-name"
          type="text"
          label={t.LinkedColumn["Column label"]}
          value={currentColumn.label ?? currentColumn.name}
          error={newColumnNameError}
          onChange={(newColName) => {
            updateColumn(
              props.column ? { label: newColName } : { name: newColName },
            );
          }}
        />
      )}
      <FlexRowWrap className="ai-end gap-p25">
        <JoinPathSelectorV2
          tableName={w.table_name}
          tables={tables}
          value={currentColumn?.nested.path}
          onChange={onJoinPathChange}
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
            <FlexRowWrap className="ai-end">
              <Select
                label={t.LinkedColumn["Layout"]}
                data-command="LinkedColumn.layoutType"
                options={["values", "drillable-records"]}
                disabledInfo={
                  currentColumn.nested.display?.type === "timechart" ?
                    "Must disable chart first"
                  : undefined
                }
                value={
                  currentColumn.nested.display?.type === "drillable-records" ?
                    "drillable-records"
                  : "values"
                }
                onChange={(type) =>
                  updateNested({ display: { type } })
                }
              />
              {(!currentColumn.nested.display ||
                currentColumn.nested.display.type === "values") && (
                <Select
                  label="Labels"
                  options={["auto", "none", "inline", "above"]}
                  value={currentColumn.nested.display?.labels ?? "auto"}
                  onChange={(labels) =>
                    updateNested({ display: { type: "values", labels } })
                  }
                />
              )}
            </FlexRowWrap>
            <FlexRowWrap>
              <Select
                label={t.LinkedColumn["Join type"]}
                value={currentColumn.nested.joinType}
                fullOptions={JOIN_TYPES}
                data-command="LinkedColumn.joinType"
                onChange={(joinType) => {
                  updateNested({ joinType });
                }}
              />
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
                variant="row"
                onChange={(limit) => {
                  updateNested({
                    limit:
                      limit && Number.isFinite(+limit) ? +limit : undefined,
                  });
                }}
              />
            </FlexRowWrap>

            {table && (
              <>
                <SmartFilterBar
                  innerClassname="mt-1 px-0"
                  filter={currentColumn.nested.detailedFilter}
                  having={currentColumn.nested.detailedHaving}
                  table_name={table.name}
                  db={db}
                  tables={tables}
                  sql={sql}
                  columns={currentColumn.nested.columns}
                  rowCount={-1}
                  methods={{}}
                  showInsertUpdateDelete={{
                    showupdate: false,
                    showdelete: false,
                    showInsert: false,
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
