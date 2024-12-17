import { mdiSortReverseVariant, mdiSortVariant } from "@mdi/js";
import React from "react";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import Select from "../../components/Select/Select";
import type { ValidatedColumnInfo } from "prostgles-types";
import type { ColumnSort } from "../W_Table/ColumnMenu/ColumnMenu";

type SortByControlProps = Pick<
  React.HTMLAttributes<HTMLDivElement>,
  "className" | "style"
> & {
  onChange: (val: ColumnSort | undefined) => void | Promise<any>;
  columns: ValidatedColumnInfo[];
  value?: ColumnSort;
  fields?: string[];
  buttonClassName?: string;
  btnProps?: BtnProps<void>;
};
function SortByControl({
  onChange,
  columns,
  value,
  fields,
  style = {},
  className = "",
  buttonClassName = "",
  btnProps,
}: SortByControlProps) {
  const setSort = (orderByKey: string | undefined, orderAsc = true) => {
    if (!orderByKey) {
      onChange(undefined);
      return;
    }
    const newSort: ColumnSort = {
      key: orderByKey,
      asc: orderAsc,
    };
    onChange(newSort);
  };
  if (fields?.length) {
    const bad = fields.filter((f) => columns.every((c) => c.name !== f));
    if (bad.length)
      console.warn("Bad fields provided for SortByControl: ", bad);
  }
  const orderableFields = columns.filter(
    (c) => c.filter && (!fields || fields.includes(c.name)),
  );
  const orderAsc = !!value?.asc;
  const orderByKey = value?.key as string;

  return (
    <div
      className={
        "Select flex-row gap-p25 min-h-0 f-0 relative ai-center " + className
      }
      style={style}
    >
      <Select
        id="orderbycomp"
        buttonClassName={"shadow " + buttonClassName}
        btnProps={btnProps}
        // style={{
        //   background: "white"
        // }}
        emptyLabel="Sort by..."
        asRow={true}
        value={value?.key}
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
}

export default SortByControl;
