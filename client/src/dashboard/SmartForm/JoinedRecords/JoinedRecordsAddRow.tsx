import { mdiPlus } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useCallback, useState } from "react";
import { getSmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import Btn from "../../../components/Btn";
import { type GetRefHooks, SmartForm } from "../SmartForm";
import { NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import type { JoinedRecordSection, JoinedRecordsProps } from "./JoinedRecords";

type P = JoinedRecordsProps & {
  section: JoinedRecordSection;
};
export const JoinedRecordsAddRow = (props: P) => {
  const {
    tables,
    db,
    tableName,
    methods,
    onSuccess,
    section,
    newRowDataHandler,
    rowFilter,
    newRowData,
  } = props;
  const refNestedForm = React.useRef<GetRefHooks>();

  const [insert, setInsert] = useState<
    | {
        /** A parent row exists. Will insert record with appropriate values in the fkey columns */
        type: "auto";
        table: string;
        data: AnyObject;
      }
    | {
        /** The parent will is yet to be inserted. Data is just passed to the parent row */
        type: "manual";
        table: string;
        onChange: (newData: AnyObject) => void;
      }
  >();

  let popupForm: React.ReactNode = null;
  const onClose = useCallback(() => {
    setInsert(undefined);
  }, []);
  if (insert?.type === "manual") {
    const fcols = tables.find((t) => t.name === insert.table)?.columns;
    const existingColumnData = newRowData?.[insert.table];
    const existingRowData =
      existingColumnData?.type === "nested-column" ?
        existingColumnData.value
      : undefined;
    const defaultNewRow =
      existingRowData instanceof NewRowDataHandler ? existingRowData : (
        undefined
      );
    popupForm = (
      <SmartForm
        tableName={insert.table}
        getRef={(r) => {
          refNestedForm.current = r;
        }}
        db={db}
        methods={methods}
        tables={tables}
        asPopup={true}
        columns={fcols
          ?.filter((c) => !c.references?.some((r) => r.ftable === tableName))
          .reduce((a, v) => ({ ...a, [v.name]: 1 }), {})}
        connection={props.connection}
        parentForm={{
          type: "insert",
          newRowDataHandler: defaultNewRow,
          table: tables.find((t) => t.name === tableName)!,
          setColumnData: (newColData) => {
            newRowDataHandler.setNestedTable(insert.table, [newColData]);
            onClose();
          },
          parentForm: props.parentForm,
        }}
        onClose={onClose}
      />
    );
  } else if (insert?.type === "auto") {
    popupForm = (
      <SmartForm
        db={db}
        tableName={insert.table}
        tables={tables}
        methods={methods}
        label={`Insert ${insert.table} record`}
        asPopup={true}
        defaultData={insert.data}
        onInserted={onClose}
        onClose={onClose}
        onSuccess={onSuccess}
        connection={props.connection}
      />
    );
  }

  /** Cannot insert if nested table
   * TODO: allow insert if path.length === 2 and first path is a mapping table
   */
  if (section.path.length > 1) return null;

  const tableHandler = db[tableName];
  const isInsert = !rowFilter;
  if (isInsert) {
    if (!db[section.tableName]) return null;
    return (
      <>
        {popupForm}
        <Btn
          key={section.tableName}
          data-command="JoinedRecords.AddRow"
          data-key={section.tableName}
          title="Add referenced record"
          color="action"
          variant="filled"
          iconPath={mdiPlus}
          onClick={() => {
            setInsert({
              type: "manual",
              table: section.tableName,
              onChange: (newRow) => {
                const value = [
                  ...(newRowData?.[section.tableName]?.value ?? []),
                  newRow,
                ];
                newRowDataHandler.setColumnData(section.tableName, {
                  type: "nested-table",
                  value,
                });
              },
            });
          }}
        />
      </>
    );
  }

  return (
    <>
      {popupForm}
      <Btn
        data-command="JoinedRecords.AddRow"
        data-key={section.tableName}
        variant="filled"
        iconPath={mdiPlus}
        title="Add new record"
        disabledInfo={
          !section.canInsert ?
            `Cannot reference more than one ${JSON.stringify(section.tableName)}`
            // : !isDescendantTableAndCanInsert ?
            //   "Cannot insert into this table"
          : undefined
        }
        onClick={async () => {
          const parentRow = await tableHandler?.findOne?.(
            getSmartGroupFilter(rowFilter),
          );
          const table = tables.find((t) => t.name === tableName);
          const joinConfig = table?.joins.find(
            (j) => j.tableName === section.tableName,
          );
          if (parentRow && joinConfig) {
            const data = {};
            joinConfig.on.map(([pcol, fcol]) => {
              data[fcol] = parentRow[pcol];
            });
            setInsert({ type: "auto", table: section.tableName, data });
          }
        }}
      />
    </>
  );
};
