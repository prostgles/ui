import { mdiSortReverseVariant, mdiSortVariant } from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import Select from "../../components/Select/Select";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";
import type { SmartFilterBarProps } from "./SmartFilterBar";
import type {
  DBSchemaTableWJoins,
  WindowSyncItem,
} from "../Dashboard/dashboardUtils";

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
  const orderableFields = columns ?? table.columns.filter((c) => c.filter);
  let orderByKey: string | undefined;
  let orderAsc = true;
  if ("w" in props) {
    orderByKey = w?.sort?.[0]?.key as string;
    orderAsc = w?.sort?.[0]?.asc ?? true;
  } else if (typeof props.sort?.key === "string") {
    orderByKey = props.sort.key;
    orderAsc = props.sort.asc ?? true;
  }

  return (
    <div className={"flex-row min-h-0 f-0 relative ai-center "}>
      <Select
        id="orderbycomp"
        buttonClassName="shadow bg-color-0"
        style={{
          background: "white",
        }}
        emptyLabel="Sort by..."
        asRow={true}
        value={orderByKey}
        fullOptions={orderableFields.map((f) => ({
          key: f.name,
          label: f.label || f.name,
        }))}
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
