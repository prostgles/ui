import React, { useMemo } from "react";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import { type SmartCardListProps } from "../../SmartCardList/SmartCardList";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";
import { ViewMoreSmartCardList } from "./ViewMoreSmartCardList";

type P = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables" | "row" | "column" | "tableName"
> & {
  ftable: DBSchemaTableWJoins;
  fcol: string;
  readOnly: boolean;
  onChange: (value: any) => void;
};

export const SmartFormFieldLinkedDataSearch = ({
  tables,
  methods,
  db,
  ftable,
  fcol,
  row,
  column,
  readOnly,
  onChange,
  tableName,
}: P) => {
  const listProps = useMemo(() => {
    return {
      onClickRow:
        readOnly ? undefined : (
          (row) => {
            onChange(row[fcol]);
          }
        ),
      searchFilter: [
        {
          fieldName: fcol,
          value: row[column.name],
        },
      ],
    } satisfies Pick<SmartCardListProps, "searchFilter" | "onClickRow">;
  }, [row, column.name, fcol, onChange, readOnly]);

  return (
    <ViewMoreSmartCardList
      db={db}
      tables={tables}
      methods={methods}
      ftable={ftable}
      rootTableName={tableName}
      {...listProps}
    />
  );
};
