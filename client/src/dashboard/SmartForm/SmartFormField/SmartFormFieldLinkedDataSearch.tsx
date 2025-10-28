import { mdiCheckCircle, mdiCheckCircleOutline } from "@mdi/js";
import React, { useMemo } from "react";
import Btn from "@components/Btn";
import { tout } from "../../../utils";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";
import {
  ViewMoreSmartCardList,
  type ViewMoreSmartCardListProps,
} from "./ViewMoreSmartCardList";

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
      getActions:
        readOnly ? undefined : (
          (cardRow, onClosePopup) => {
            const currentValue = row[column.name];
            const newValue = cardRow[fcol];
            /** Some numeric fields are returned as strings */
            if (currentValue == newValue)
              return (
                <Btn
                  title="Selected"
                  variant="icon"
                  disabledInfo="Already selected"
                  iconPath={mdiCheckCircle}
                />
              );
            return (
              <Btn
                title="Select"
                variant="icon"
                color="action"
                iconPath={mdiCheckCircleOutline}
                onClickPromise={async () => {
                  onChange(newValue);
                  await tout(1000);
                  onClosePopup();
                }}
              />
            );
          }
        ),
      searchFilter: [
        {
          fieldName: fcol,
          value: row[column.name],
          minimised: true,
        },
      ],
    } satisfies Pick<ViewMoreSmartCardListProps, "searchFilter" | "getActions">;
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
