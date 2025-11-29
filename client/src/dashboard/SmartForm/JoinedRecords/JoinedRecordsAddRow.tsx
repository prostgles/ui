import { mdiPlus } from "@mdi/js";
import React, { useCallback, useMemo, useState } from "react";
import Btn, { type BtnProps } from "@components/Btn";
import { SmartForm, type SmartFormProps } from "../SmartForm";
import { useNestedInsertDefaultData } from "../SmartFormField/useNestedInsertDefaultData";
import { NewRowDataHandler } from "../SmartFormNewRowDataHandler";
import type { JoinedRecordsProps } from "./JoinedRecords";
import type { JoinedRecordSection } from "./useJoinedRecordsSections";

type P = Omit<JoinedRecordsProps, "newRowDataHandler"> & {
  newRowDataHandler: NewRowDataHandler;
  section: JoinedRecordSection;
  btnProps?: Pick<BtnProps, "size" | "className">;
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
    row,
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

  const isInsert = !rowFilter;

  const onClose = useCallback(() => {
    setInsert(undefined);
  }, []);

  const defaultData = useNestedInsertDefaultData({
    ftable: section.tableName,
    tables,
    tableName,
    row,
  });

  const btnProps: Pick<BtnProps, "title" | "onClick" | "disabledInfo"> =
    useMemo(() => {
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
        return {
          title: "Add referenced record",
          onClick: () => {
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
      return {
        title: "Add new record",
        onClick: () => {
          if (defaultData) {
            setInsert({
              type: "auto",
              smartFormProps: {
                defaultData,
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
          : undefined,
      };
    }, [
      isInsert,
      section.canInsert,
      section.table.info.isView,
      section.tableName,
      section.tableHandler,
      newRowData,
      newRowDataHandler,
      tableName,
      tables,
      onClose,
      onSuccess,
      props.parentForm,
      defaultData,
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
          onClose={onClose}
          {...insert.smartFormProps}
        />
      )}
      <Btn
        {...props.btnProps}
        data-command="JoinedRecords.AddRow"
        data-key={section.tableName}
        // variant="filled"
        color="action"
        iconPath={mdiPlus}
        // children="Add"
        {...btnProps}
      />
    </>
  );
};
