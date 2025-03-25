import { mdiPlus } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useCallback, useMemo, useState } from "react";
import { getSmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import Btn, { type BtnProps } from "../../../components/Btn";
import { type GetRefHooks, SmartForm } from "../SmartForm";
import { NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import type { JoinedRecordSection, JoinedRecordsProps } from "./JoinedRecords";

type P = Omit<JoinedRecordsProps, "newRowDataHandler"> & {
  newRowDataHandler: NewRowDataHandler;
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

  const { tableHandler } = db[tableName];
  const isInsert = !rowFilter;

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

  const btnProps: Pick<BtnProps, "onClick" | "title" | "disabledInfo"> =
    useMemo(() => {
      if (isInsert) {
        return {
          title: "Add referenced record",
          onClick: async () => {
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
          },
        };
      }
      return {
        title: "Add new record",
        onClick: async () => {
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
        },
        disabledInfo:
          !section.canInsert ?
            section.table.info.isView ? "Cannot insert into a view"
            : section.tableHandler?.insert ? "Cannot insert into this table"
            : `Cannot reference more than one ${JSON.stringify(section.tableName)}`
            // : !isDescendantTableAndCanInsert ?
            //   "Cannot insert into this table"
          : undefined,
      };
    }, [
      isInsert,
      section.canInsert,
      section.table.info.isView,
      section.tableName,
      section.tableHandler,
      rowFilter,
      newRowData,
      newRowDataHandler,
      tableHandler,
      tableName,
      tables,
    ]);

  /** Cannot insert if nested table
   * TODO: allow insert if path.length === 2 and first path is a mapping table
   */
  if (section.path.length > 1) return null;

  if (isInsert && !section.tableHandler) return null;

  return (
    <>
      {popupForm}
      <Btn
        data-command="JoinedRecords.AddRow"
        data-key={section.tableName}
        variant="filled"
        color="action"
        iconPath={mdiPlus}
        title="Add new record"
        {...btnProps}
      />
    </>
  );
};
