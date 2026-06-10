import { mdiSortReverseVariant, mdiSortVariant } from "@mdi/js";
import React from "react";
import Btn from "@components/Btn";
import { Select } from "@components/Select/Select";
import type {
  DBSchemaTableWJoins,
  WindowSyncItem,
} from "../Dashboard/dashboardUtils";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
import type { SmartFilterBarProps } from "./SmartFilterBar";
import { isDefined } from "@common/filterUtils";

type P = SmartFilterBarProps & {
  table: DBSchemaTableWJoins;
};
export const SmartFilterBarSort = ({ table, ...props }: P) => {
  const w: WindowSyncItem<"table"> | WindowSyncItem<"card"> | undefined =
    "w" in props ? props.w : undefined;
  const { columns } = "w" in props ? props.w : props;
  const setSort = (orderByKey: string | undefined, orderAsc = true) => {
    const newSort: ColumnSort | undefined =
      !orderByKey ? undefined : (
        {
          key: orderByKey,
          asc: orderAsc,
        }
      );
    if ("w" in props) {
      w && w.$update({ sort: newSort && [newSort] });
    } else if (props.onSortChange) {
      props.onSortChange(newSort);
    }
  };
  let orderByKey: string | undefined;
  let orderAsc = true;
  if ("w" in props) {
    orderByKey = w?.sort?.[0]?.key;
    orderAsc = w?.sort?.[0]?.asc ?? true;
  } else if (typeof props.sort?.key === "string") {
    orderByKey = props.sort.key;
    orderAsc = props.sort.asc ?? true;
  }

  return (
    <div className={"flex-row min-h-0 f-0 relative ai-center "}>
      <Select
        id="orderbycomp"
        btnProps={{
          className: "shadow bg-color-0",
        }}
        style={{
          background: "white",
        }}
        emptyLabel="Sort by..."
        asRow={true}
        value={orderByKey}
        fullOptions={
          columns
            ?.flatMap((c) => {
              if (!c.show) return;
              if (c.nested) {
                if (c.nested.chart) {
                  return ["date", "value"].map((k) => ({
                    key: `${c.name}.${k}`,
                    label: `${c.name} - ${k}`,
                  }));
                }
                return c.nested.columns.map((nc) =>
                  !nc.show ? undefined : (
                    {
                      key: `${c.name}.${nc.name}`,
                      label: `${c.name} - ${nc.name}`,
                    }
                  ),
                );
              }
              return {
                key: c.name,
                label: c.name,
              };
            })
            .filter(isDefined) ??
          table.columns
            .filter((c) => c.filter)
            .flatMap(({ name, label }) => {
              return {
                key: name,
                label: label || name,
              };
            })
        }
        onChange={(orderByKey) => {
          setSort(orderByKey, orderAsc);
        }}
        optional={true}
      />
      {orderByKey && (
        <Btn
          color="action"
          iconPath={orderAsc ? mdiSortReverseVariant : mdiSortVariant}
          onClick={() => {
            setSort(orderByKey, !orderAsc);
          }}
        />
      )}
    </div>
  );
};
