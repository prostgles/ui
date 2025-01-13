import React, { useEffect, useMemo, useState } from "react";
import SearchList from "../../../components/SearchList/SearchList";
import type { ColumnConfig } from "./ColumnMenu";
import {
  useMemoDeep,
  type DBHandlerClient,
} from "prostgles-client/dist/prostgles";
import { FlexRow } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import { AlterColumn } from "./AlterColumn/AlterColumn";
import Btn from "../../../components/Btn";
import { mdiDelete, mdiFunction, mdiLink, mdiPencil } from "@mdi/js";
import { getColumnListItem } from "./ColumnsMenu";
import type { ColumnConfigWInfo } from "../W_Table";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";
import type {
  DBSchemaTablesWJoins,
  LoadedSuggestions,
  WindowData,
} from "../../Dashboard/dashboardUtils";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { SummariseColumn } from "./SummariseColumns";
import type { ValidatedColumnInfo } from "prostgles-types";
import { omitKeys } from "prostgles-types";
import type { Prgl } from "../../../App";

type P = {
  columns: ColumnConfigWInfo[];
  tableColumns: ValidatedColumnInfo[];
  onChange: (newCols: ColumnConfigWInfo[]) => void;
  mainMenuProps:
    | undefined
    | {
        prgl: Prgl;
        w: SyncDataItem<Required<WindowData<"table">>, true>;
        db: DBHandlerClient;
        suggestions: LoadedSuggestions | undefined;
        table: DBSchemaTablesWJoins[number];
        tables: DBSchemaTablesWJoins;
        onClose: VoidFunction;
      };
  showToggle?: boolean;
};

export const ColumnList = ({
  columns: columnsWithoutInfo,
  tableColumns,
  mainMenuProps,
  onChange,
  showToggle = true,
}: P) => {
  const { db } = mainMenuProps ?? {};

  const columns: ColumnConfigWInfo[] = useMemoDeep(
    () =>
      columnsWithoutInfo.map((c) => {
        const col = tableColumns.find((tc) => tc.name === c.name);
        return { ...c, info: col };
      }),
    [columnsWithoutInfo],
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
      onReorder={async (nc) => {
        setOrder(Object.fromEntries(nc.map((d, i) => [d.key, i])));
        await onChange(
          nc.map((n) => ({ ...(n.data as ColumnConfig), show: n.checked })),
        );
      }}
      limit={200}
      className="f-1"
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
        .sort(
          (a, b) => (order[a.name] ?? Infinity) - (order[b.name] ?? Infinity),
        )
        .map((c) => {
          const computedRemove =
            c.format ? "Remove formatting"
            : c.computedConfig?.isColumn ? "Remove Function"
            : c.computedConfig || c.nested ? "Remove computed field"
            : undefined;
          return {
            ...getColumnListItem({ ...c.info, name: c.name }, c),
            ...(showToggle ? { checked: c.show } : {}),
            data: c,
            rowClassname: "trigger-hover",
            contentRight:
              !mainMenuProps || (!db?.sql && !c.computedConfig) ?
                null
              : <FlexRow className="mr-p5" onClick={(e) => e.stopPropagation()}>
                  {db?.sql && !c.computedConfig && !c.nested && (
                    <PopupMenu
                      positioning="center"
                      title={`Alter ${c.name}`}
                      button={
                        <Btn
                          iconPath={mdiPencil}
                          title="Alter column"
                          color="action"
                          className="show-on-trigger-hover"
                        />
                      }
                      onClickClose={false}
                    >
                      <AlterColumn {...mainMenuProps} field={c.name} />
                    </PopupMenu>
                  )}
                  {c.nested && (
                    <PopupMenu
                      title="Edit Linked Field"
                      button={
                        <Btn
                          color="action"
                          iconPath={mdiLink}
                          title="Edit Linked Field"
                        />
                      }
                      render={(pClose) => (
                        <LinkedColumn
                          {...mainMenuProps}
                          column={c}
                          onClose={pClose}
                        />
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
              //@ts-ignore
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
