import Btn from "@components/Btn";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiCircleHalf, mdiSetLeftCenter } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import React from "react";
import { getColumnListItem } from "../ColumnSelect/getColumnListItem";
import type { AddComputedColumnState } from "./useAddComputedColumn";

type P = Pick<
  AddComputedColumnState,
  "allowedColumns" | "setIncludeJoins" | "includeJoins"
> & {
  column: ValidatedColumnInfo | undefined;
  onChange: (column: ValidatedColumnInfo | undefined) => void;
};

export const FunctionColumnList = ({
  column,
  allowedColumns,
  onChange,
  includeJoins,
  setIncludeJoins,
}: P) => {
  if (!allowedColumns) return;

  return (
    <>
      {column ?
        <Btn
          style={{ minWidth: "50px" }}
          label={{
            label: "Column",
            variant: "normal",
            className: "mb-p25",
          }}
          variant="faded"
          color="action"
          onClick={() => {
            onChange(undefined);
          }}
        >
          {column.label || column.name}
        </Btn>
      : <SearchList
          leftContent={
            <Btn
              title={"Include joins: " + (includeJoins ? "On" : "Off")}
              iconPath={mdiSetLeftCenter}
              color={includeJoins ? "action" : undefined}
              onClick={() => setIncludeJoins(!includeJoins)}
            />
          }
          style={{ maxHeight: "500px" }}
          id="cols-select"
          label="Applicable columns"
          className="f-1"
          items={allowedColumns.map((c) => ({
            ...getColumnListItem(c),
            parentLabels: c.join?.labels.map(({ label }) => label) ?? [],
            // label: c.label || c.name,
            onPress: () => {
              onChange(c);
            },
          }))}
        />
      }
    </>
  );
};
