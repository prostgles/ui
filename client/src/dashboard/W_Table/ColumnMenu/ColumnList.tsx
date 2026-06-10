import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { SearchList } from "@components/SearchList/SearchList";
import {
  mdiDelete,
  mdiFormatColorFill,
  mdiFunction,
  mdiLink,
  mdiPencil,
} from "@mdi/js";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { omitKeys } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type {
  DBSchemaTablesWJoins,
  LoadedSuggestions,
  WindowData,
} from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../W_Table";
import { AlterColumn } from "./AlterColumn/AlterColumn";
import type { ColumnConfig } from "./ColumnMenu";
import { getColumnListItem } from "./ColumnSelect/getColumnListItem";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";
import { SummariseColumn } from "./SummariseColumns";
import { ColumnStyleControls } from "./ColumnStyleControls/ColumnStyleControls";

type P = {
  columns: ColumnConfigWInfo[];
  onChange: (newCols: ColumnConfigWInfo[]) => void;
  w: SyncDataItem<Required<WindowData<"table">>, { handlesOnData: true }>;
  table: DBSchemaTablesWJoins[number];
  suggestions: LoadedSuggestions | undefined;
  onClose: VoidFunction;
  showToggle?: boolean;
};

export const ColumnList = ({
  columns: columnsWithoutInfo,
  table,
  onChange,
  showToggle = true,
  w,
  onClose,
}: P) => {
  const prgl = usePrgl();
  const { sql, tables } = prgl;
  const tableColumns = table.columns;
  const columns: ColumnConfigWInfo[] = useMemo(
    () =>
      columnsWithoutInfo.map((c) => {
        const col = tableColumns.find((tc) => tc.name === c.name);
        return { ...c, info: col };
      }),
    [columnsWithoutInfo, tableColumns],
  );

  /** Ensure columns do not change order when toggling */
  const [order, setOrder] = useState<Record<string, number>>(
    Object.fromEntries(
      columns
        .sort((a, b) => +Boolean(b.show) - +Boolean(a.show))
        .map((c, i) => [c.name, i]),
    ),
  );

  return (
    <SearchList
      id="cols"
      onReorder={(nc) => {
        setOrder(Object.fromEntries(nc.map((d, i) => [d.key, i])));
        onChange(
          nc.map((n) => ({ ...(n.data as ColumnConfig), show: n.checked })),
        );
      }}
      limit={200}
      className="f-1 p-1"
      style={{ minWidth: "400px" }}
      onMultiToggle={
        !showToggle ? undefined : (
          (items) => {
            const nc = columns.slice(0).map((_c) => ({
              ..._c,
              show: items.find((d) => d.key === _c.name)?.checked ?? _c.show,
            }));
            onChange(nc);
          }
        )
      }
      placeholder={`Search ${columns.length} columns`}
      items={columns
        .toSorted(
          (a, b) => (order[a.name] ?? Infinity) - (order[b.name] ?? Infinity),
        )
        .map((c) => {
          const computedRemove =
            c.format ? "Remove formatting"
            : c.computedConfig?.isColumn ? "Remove Function"
            : c.computedConfig || c.nested ? "Remove computed field"
            : undefined;

          const nestedColumn = c.nested ? c.nested : undefined;
          const nestedColumnsToShow = nestedColumn?.columns.filter(
            (col) => col.show,
          );
          const targetNestedColumn =
            nestedColumnsToShow && nestedColumnsToShow.length === 1 ?
              nestedColumnsToShow[0]
            : undefined;
          const targetTable =
            targetNestedColumn && nestedColumn ?
              tables.find((t) => t.name === nestedColumn.path.at(-1)?.table)
            : undefined;
          const targetColumnInfo =
            !targetNestedColumn || !targetTable ?
              undefined
            : (targetNestedColumn.computedConfig ??
              targetTable.columns.find(
                (c) => c.name === targetNestedColumn.name,
              ));
          return {
            ...getColumnListItem({ ...c.info, name: c.name }, c),
            ...(showToggle ? { checked: c.show } : {}),
            data: c,
            rowClassname: "trigger-hover",
            contentRight:
              !sql && !c.computedConfig ?
                null
              : <FlexRow className="mr-p5" onClick={(e) => e.stopPropagation()}>
                  {sql && !c.computedConfig && !c.nested && (
                    <PopupMenu
                      positioning="center"
                      title={`Alter ${c.name}`}
                      clickCatchStyle={{ opacity: 1 }}
                      data-command="W_TableMenu_ColumnList.alter"
                      button={
                        <Btn
                          iconPath={mdiPencil}
                          title="Alter column"
                          color="action"
                          className="show-on-trigger-hover"
                        />
                      }
                      onClickClose={false}
                      contentClassName="p-1"
                    >
                      <AlterColumn
                        table={table}
                        onClose={onClose}
                        prgl={prgl}
                        suggestions={undefined}
                        field={c.name}
                      />
                    </PopupMenu>
                  )}
                  {nestedColumn && targetNestedColumn && (
                    <PopupMenu
                      positioning="center"
                      title={`Alter ${c.name}`}
                      clickCatchStyle={{ opacity: 1 }}
                      data-command="W_TableMenu_ColumnList.alter"
                      button={
                        <Btn
                          iconPath={mdiFormatColorFill}
                          title="Style column"
                          color="action"
                          className="show-on-trigger-hover"
                        />
                      }
                      onClickClose={false}
                      contentClassName="p-1"
                    >
                      <ColumnStyleControls
                        db={prgl.db}
                        tableName={nestedColumn.path.at(-1)!.table}
                        tables={prgl.tables}
                        column={targetNestedColumn}
                        onUpdate={({ style }) => {
                          const newCols = columns.map((col) => {
                            if (col.name === c.name && col.nested) {
                              return {
                                ...col,
                                nested: {
                                  ...col.nested,
                                  columns: nestedColumn.columns.map((nc) =>
                                    nc.name === targetNestedColumn.name ?
                                      { ...nc, style }
                                    : nc,
                                  ),
                                },
                              };
                            }
                            return col;
                          });
                          onChange(newCols);
                        }}
                        tsDataType={targetColumnInfo?.tsDataType || "any"}
                        udt_name={targetColumnInfo?.udt_name || "text"}
                      />
                    </PopupMenu>
                  )}
                  {c.nested && (
                    <PopupMenu
                      title="Edit Linked Field"
                      data-command="W_TableMenu_ColumnList.linkedColumnOptions"
                      button={
                        <Btn
                          color="action"
                          iconPath={mdiLink}
                          title="Edit Linked Field"
                        />
                      }
                      render={(pClose) => (
                        <LinkedColumn w={w} column={c} onClose={pClose} />
                      )}
                    />
                  )}
                  {!c.computedConfig && !c.nested && c.info && (
                    <SummariseColumn
                      column={c}
                      columns={columns}
                      tableColumns={tableColumns}
                      onChange={onChange}
                    />
                  )}
                  {!!computedRemove && (
                    <Btn
                      data-command="W_TableMenu_ColumnList.removeComputedColumn"
                      className="mr-1"
                      color="danger"
                      title={computedRemove}
                      children={
                        computedRemove === "Remove Function" ?
                          c.computedConfig?.funcDef.label
                        : undefined
                      }
                      iconPath={
                        computedRemove === "Remove Function" ? mdiFunction : (
                          mdiDelete
                        )
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        let newCols;
                        if (
                          computedRemove === "Remove formatting" ||
                          computedRemove === "Remove Function"
                        ) {
                          newCols = columns.map((_c) => {
                            if (_c.name === c.name) {
                              const res = omitKeys(
                                {
                                  ..._c,
                                  computed: false,
                                },
                                computedRemove === "Remove formatting" ?
                                  ["format"]
                                : ["computedConfig"],
                              );

                              return res;
                            }
                            return _c;
                          });
                        } else {
                          newCols = columns.filter((_c) => _c.name !== c.name);
                        }

                        onChange(newCols);
                      }}
                    />
                  )}
                </FlexRow>,
            onPress: () => {
              const nc = columns
                .slice(0)
                .map((_c) => ({ ..._c }))
                .map((_c) => {
                  if (_c.name === c.name) {
                    _c.show = !c.show;
                  }
                  return _c;
                });
              onChange(nc);
            },
          };
        })}
    />
  );
};
