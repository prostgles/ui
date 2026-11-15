import { FlexRow } from "@components/Flex";
import { SearchList } from "@components/SearchList/SearchList";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React, { useMemo, useState } from "react";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type {
  DBSchemaTablesWJoins,
  LoadedSuggestions,
} from "../../Dashboard/dashboardUtils";
import type { WindowData } from "@common/ColumnConfig/WindowData";
import { getColumnsWithInfo } from "../tableUtils/getColumnsWithInfo";
import { ColumnListItemOptions } from "./ColumnListItemOptions";
import type {
  ColumnConfig,
  NestedDisplay,
} from "@common/ColumnConfig/ColumnConfig";
import { getColumnListItem } from "./ColumnSelect/getColumnListItem";
import { SummariseColumn } from "./SummariseColumns";

type P = {
  columns: ColumnConfig[];
  onChange: (newCols: ColumnConfig[]) => void;
  w: SyncDataItem<Required<WindowData<"table">>, { handlesOnData: true }>;
  table: DBSchemaTablesWJoins[number];
  suggestions: LoadedSuggestions | undefined;
  onClose: VoidFunction;
  showToggle?: boolean;
  parentDisplay?: NestedDisplay["type"];
};

export const ColumnList = ({
  columns: columnsWithoutInfo,
  table,
  onChange,
  showToggle = true,
  parentDisplay,
  w,
  onClose,
}: P) => {
  const prgl = usePrgl();
  const { tables } = prgl;
  const columns = useMemo(
    () => getColumnsWithInfo(table.name, tables, columnsWithoutInfo),
    [columnsWithoutInfo, table.name, tables],
  );

  /** Ensure columns do not change order when toggling */
  const [order, setOrder] = useState(
    new Map(
      columns
        .sort((a, b) => +Boolean(b.show) - +Boolean(a.show))
        .map((c, i) => [c.name, i]),
    ),
  );

  return (
    <SearchList
      id="cols"
      onReorder={(nc) => {
        setOrder(new Map(nc.map((d, i) => [d.key as string, i])));
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
          (a, b) =>
            (order.get(a.name) ?? Infinity) - (order.get(b.name) ?? Infinity),
        )
        .map((c) => {
          return {
            ...getColumnListItem({ ...c.info, name: c.name }, c),
            ...(showToggle ? { checked: c.show } : {}),
            data: c,
            rowClassname: "trigger-hover",
            contentRight: (
              <FlexRow className="mr-p5" onClick={(e) => e.stopPropagation()}>
                {!c.computedConfig && !c.nested && c.info && (
                  <SummariseColumn
                    column={c}
                    columns={columns}
                    table={table}
                    onChange={onChange}
                  />
                )}
                <ColumnListItemOptions
                  parentDisplay={parentDisplay}
                  column={c}
                  columns={columns}
                  onChange={onChange}
                  onClose={onClose}
                  table={table}
                  w={w}
                />
              </FlexRow>
            ),
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
