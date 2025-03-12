import type { AnyObject } from "prostgles-types";
import React, { useCallback, useState } from "react";
import Popup from "../../../components/Popup/Popup";
import SmartForm, { type GetRefHooks } from "../SmartForm";
import type { JoinedRecordsProps, JoinedRecordsState } from "./JoinedRecords";
import Btn from "../../../components/Btn";
import { mdiPlus } from "@mdi/js";
import { getSmartGroupFilter } from "../../../../../commonTypes/filterUtils";

type P = JoinedRecordsProps & {
  section: JoinedRecordsState["sections"][number];
};
export const JoinedRecordsAddRow = (props: P) => {
  const {
    tables,
    db,
    tableName,
    methods,
    onSuccess,
    theme,
    section,
    onSetNestedInsertData,
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
    popupForm = (
      <Popup
        title={`Insert ${insert.table} record`}
        positioning="right-panel"
        onClose={() => {
          // setNestedInsert({ nestedInsertData, nestedInsertTable: undefined });
          onClose();
        }}
        contentStyle={{
          padding: 0,
        }}
        footerButtons={[
          {
            label: "Cancel",
            onClickClose: true,
          },
          {
            label: "Add",
            variant: "filled",
            className: "ml-auto",
            color: "action",
            onClick: () => {
              refNestedForm.current?.getErrors((newRow) => {
                insert.onChange(newRow);
                onClose();
              });
            },
          },
        ]}
      >
        <SmartForm
          theme={theme}
          tableName={insert.table}
          getRef={(r) => {
            refNestedForm.current = r;
          }}
          db={db}
          methods={methods}
          tables={tables}
          label=" "
          onChange={() => {}}
          // onSuccess={onSuccess}
          columns={fcols
            ?.filter((c) => !c.references?.some((r) => r.ftable === tableName))
            .reduce((a, v) => ({ ...a, [v.name]: 1 }), {})}
        />
      </Popup>
    );
  } else if (insert?.type === "auto") {
    popupForm = (
      <SmartForm
        theme={theme}
        db={db}
        tableName={insert.table}
        tables={tables}
        methods={methods}
        label={`Insert ${insert.table} record`}
        hideChangesOptions={true}
        showLocalChanges={false}
        asPopup={true}
        defaultData={insert.data}
        onInserted={onClose}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  /** Cannot insert if nested table
   * TODO: allow insert if path.length === 2 and first path is a mapping table
   */
  if (section.path.length > 1) return null;

  const isDescendantTableAndCanInsert = tables.some(
    (t) =>
      t.columns.some((c) =>
        c.references?.some((r) => r.ftable === section.tableName),
      ) && db[t.name]?.insert,
  );
  const tableHandler = db[tableName];
  const isInsert = !!onSetNestedInsertData && !rowFilter;
  if (isInsert && isDescendantTableAndCanInsert) {
    if (!db[section.tableName]) return null;
    return (
      <>
        {popupForm}
        <Btn
          key={section.tableName}
          title="Add referenced record"
          color="action"
          iconPath={mdiPlus}
          onClick={() => {
            setInsert({
              type: "manual",
              table: section.tableName,
              onChange: (newRow) => {
                onSetNestedInsertData(section.tableName, [
                  ...(newRowData?.[section.tableName]?.value ?? []),
                  newRow,
                ]);
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
        iconPath={mdiPlus}
        title="Add new record"
        disabledInfo={
          !section.canInsert ?
            `Cannot reference more than one ${JSON.stringify(section.tableName)}`
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
