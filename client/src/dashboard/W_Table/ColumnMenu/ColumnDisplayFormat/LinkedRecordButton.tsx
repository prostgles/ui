import type { DetailedFilterBase } from "@common/filterUtils";
import Btn from "@components/Btn";
import React, { useState } from "react";
import type { Prgl } from "src/App";
import { SmartForm } from "../../../SmartForm/SmartForm";
import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";
import { useLocalSettings } from "../../../localSettings";
import { DetailedCardPopup } from "../../../SmartCard/DetailedCardPopup";
import type { FieldConfig } from "../../../SmartCard/SmartCard";
import { SmartCardList } from "../../../SmartCardList/SmartCardList";
import { getTableCardFieldConfigs } from "../../../SmartForm/SmartFormField/getTableCardFieldConfigs";

type LinkedRecordButtonProps = Pick<
  Prgl,
  "db" | "methods" | "sql" | "tables"
> & {
  children: React.ReactNode;
  buttonProps?: Pick<
    React.ComponentProps<typeof Btn>,
    "variant" | "style" | "className"
  >;
  rowFilter: DetailedFilterBase[];
  table: DBSchemaTableWJoins;
};

export const LinkedRecordButton = ({
  children,
  buttonProps,
  db,
  methods,
  rowFilter,
  sql,
  table,
  tables,
}: LinkedRecordButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cardFieldConfigs, setCardFieldConfigs] = useState<FieldConfig[]>();
  const { openLinkedRecordsAsCards } = useLocalSettings();

  return (
    <>
      <Btn
        variant="faded"
        color="action"
        size="small"
        className="max-w-full text-ellipsis"
        {...buttonProps}
        title={`Open ${table.label}`}
        data-command="LinkedColumn.OpenRecord"
        onClickPromise={async (event) => {
          event.stopPropagation();
          setCardFieldConfigs(
            openLinkedRecordsAsCards ?
              await getTableCardFieldConfigs({
                table,
                tables,
                db,
                methods,
                infoLevel: 2,
              })
            : undefined,
          );
          setIsOpen(true);
        }}
      >
        {children}
      </Btn>
      {isOpen &&
        (cardFieldConfigs ?
          <DetailedCardPopup
            prgl={{ db, methods, sql, tables }}
            table={table}
            rowFilter={rowFilter}
            fieldConfigs={cardFieldConfigs}
            showEdit={undefined}
            onClose={() => setIsOpen(false)}
            renderDetails={(props) => <SmartCardList {...props} />}
          />
        : <SmartForm
            db={db}
            methods={methods}
            sql={sql}
            tables={tables}
            asPopup={true}
            tableName={table.name}
            rowFilter={rowFilter}
            confirmUpdates={true}
            onClose={() => setIsOpen(false)}
          />)}
    </>
  );
};
