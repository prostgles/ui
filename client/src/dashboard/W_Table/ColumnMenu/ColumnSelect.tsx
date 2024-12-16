import { mdiClose } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types";
import {
  _PG_bool,
  _PG_date,
  _PG_geometric,
  _PG_interval,
  _PG_json,
  _PG_numbers,
  _PG_postgis,
  _PG_strings,
} from "prostgles-types";
import React from "react";
import Btn from "../../../components/Btn";
import FormField from "../../../components/FormField/FormField";
import { getColumnListItem } from "./ColumnsMenu";
import type { TestSelectors } from "../../../Testing";
type P = TestSelectors & {
  columns: (ValidatedColumnInfo & { disabledInfo?: string })[];
  onChange: (columnName?: string) => void;
  label?: string;
  value?: string;
};

export const ColumnSelect = ({
  columns,
  onChange,
  label,
  value,
  ...testSelectors
}: P) => {
  const items = columns.map((c) => ({
    ...getColumnListItem(c),
    data: c,
  }));

  return (
    <div className="flex-row ai-end">
      <FormField
        {...testSelectors}
        asColumn={true}
        label={label}
        value={value}
        fullOptions={items}
        onChange={onChange}
      />
      <Btn
        iconPath={mdiClose}
        onClick={() => {
          onChange();
        }}
      />
    </div>
  );
};

export const PG_Types = {
  _PG_strings,
  _PG_numbers,
  _PG_json,
  _PG_bool,
  _PG_date,
  _PG_interval,
  _PG_postgis,
  _PG_geometric,
} as const;
type PG_T = keyof typeof PG_Types;
export const colIs = (
  c: Partial<Pick<ValidatedColumnInfo, "udt_name">> | undefined,
  type: PG_T | PG_T[],
) => {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => PG_Types[t].some((v) => c?.udt_name === v));
};
