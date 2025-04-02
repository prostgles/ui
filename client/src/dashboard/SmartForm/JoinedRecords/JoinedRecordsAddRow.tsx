import { mdiPlus } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useCallback, useMemo, useState } from "react";
import { getSmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import Btn, { type BtnProps } from "../../../components/Btn";
import type { PopupProps } from "../../../components/Popup/Popup";
import { SmartForm, type SmartFormProps } from "../SmartForm";
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

  const [insert, setInsert] = useState<{
    /**
     * auto = A parent row exists. Will insert record with appropriate values in the fkey columns
     * manual = The parent will is yet to be inserted. Data is just passed to the parent row
     * */
    type: "auto" | "manual";
    smartFormProps: Pick<
      SmartFormProps,
      | "parentForm"
      | "columns"
      | "label"
      | "defaultData"
      | "onInserted"
      | "onSuccess"
    >;
  }>();

  const tableHandler = db[tableName];
  const isInsert = !rowFilter;

  // let popupForm: React.ReactNode = null;
  const onClose = useCallback(() => {
    setInsert(undefined);
  }, []);

  // if (insert?.type === "manual") {
  //   const fcols = tables.find((t) => t.name === section.tableName)?.columns;
  //   const existingColumnData = newRowData?.[section.tableName];
  //   const existingRowData =
  //     existingColumnData?.type === "nested-column" ?
  //       existingColumnData.value
  //     : undefined;
  //   const defaultNewRow =
  //     existingRowData instanceof NewRowDataHandler ? existingRowData : (
  //       undefined
  //     );
  //   popupForm = (
  //     <SmartForm
  //       tableName={section.tableName}
  //       db={db}
  //       methods={methods}
  //       tables={tables}
  //       asPopup={true}
  //       connection={props.connection}
  //       onClose={onClose}
  //       columns={fcols
  //         ?.filter((c) => !c.references?.some((r) => r.ftable === tableName))
  //         .reduce((a, v) => ({ ...a, [v.name]: 1 }), {})}
  //       parentForm={{
  //         type: "insert",
  //         newRowDataHandler: defaultNewRow,
  //         table: tables.find((t) => t.name === tableName)!,
  //         setColumnData: (newColData) => {
  //           newRowDataHandler.setNestedTable(section.tableName, [newColData]);
  //           onClose();
  //         },
  //         parentForm: props.parentForm,
  //       }}
  //     />
  //   );
  // } else if (insert?.type === "auto") {
  //   popupForm = (
  //     <SmartForm
  //       tableName={section.tableName}
  //       db={db}
  //       methods={methods}
  //       tables={tables}
  //       asPopup={true}
  //       connection={props.connection}
  //       onClose={onClose}
  //     />
  //   );
  // }

  const { btnProps } = useMemo(() => {
    let btnProps: Pick<BtnProps, "onClick" | "title" | "disabledInfo"> = {};
    if (isInsert) {
      const fcols = tables.find((t) => t.name === section.tableName)?.columns;
      const existingColumnData = newRowData?.[section.tableName];
      const existingRowData =
        existingColumnData?.type === "nested-column" ?
          existingColumnData.value
        : undefined;
      const defaultNewRow =
        existingRowData instanceof NewRowDataHandler ? existingRowData : (
          undefined
        );
      btnProps = {
        title: "Add referenced record",
        onClick: async () => {
          setInsert({
            type: "manual",
            // onChange: (newRow) => {
            //   const value = [
            //     ...(newRowData?.[section.tableName]?.value ?? []),
            //     newRow,
            //   ];
            //   newRowDataHandler.setColumnData(section.tableName, {
            //     type: "nested-table",
            //     value,
            //   });
            // },
            smartFormProps: {
              columns: fcols
                ?.filter(
                  (c) => !c.references?.some((r) => r.ftable === tableName),
                )
                .reduce((a, v) => ({ ...a, [v.name]: 1 }), {}),
              parentForm: {
                type: "insert",
                newRowDataHandler: defaultNewRow,
                table: tables.find((t) => t.name === tableName)!,
                setColumnData: (newColData) => {
                  newRowDataHandler.setNestedTable(section.tableName, [
                    newColData,
                  ]);
                  onClose();
                },
                parentForm: props.parentForm,
              },
            },
          });
        },
      };
    }
    btnProps = {
      title: "Add new record",
      onClick: async () => {
        const parentRow = await tableHandler?.findOne?.(
          getSmartGroupFilter(rowFilter),
        );
        const table = tables.find((t) => t.name === tableName);
        const joinConfig = table?.joinsV2.find(
          (j) => j.tableName === section.tableName,
        );
        if (parentRow && joinConfig) {
          const data = {};
          joinConfig.on.map((fkey) => {
            fkey.map(([pcol, fcol]) => {
              data[fcol] = parentRow[pcol];
            });
          });
          setInsert({
            type: "auto",
            smartFormProps: {
              label: `Insert ${section.tableName} record`,
              defaultData: data,
              onInserted: onClose,
              onSuccess: onSuccess,
            },
          });
        }
      },
      disabledInfo:
        !section.canInsert ?
          section.table.info.isView ? "Cannot insert into a view"
          : !section.tableHandler?.insert ? "Cannot insert into this table"
          : `Cannot reference more than one ${JSON.stringify(section.tableName)}`
          // : !isDescendantTableAndCanInsert ?
          //   "Cannot insert into this table"
        : undefined,
    };

    return { btnProps };
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
    onClose,
    onSuccess,
    props.parentForm,
  ]);

  /** Cannot insert if nested table
   * TODO: allow insert if path.length === 2 and first path is a mapping table
   */
  if (section.path.length > 1) return null;

  if (isInsert && !section.tableHandler) return null;

  return (
    <>
      {insert && (
        <SmartForm
          tableName={section.tableName}
          db={db}
          methods={methods}
          tables={tables}
          asPopup={true}
          connection={props.connection}
          onClose={onClose}
          {...insert.smartFormProps}
        />
      )}
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
