import { mdiPlus } from "@mdi/js";
import { asName } from "prostgles-types";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { Prgl, PrglCore } from "../../App";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { InfoRow } from "@components/InfoRow";
import Popup from "@components/Popup/Popup";
import Select from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import { FileColumnConfigEditor } from "./FileColumnConfigEditor";
import { useFileTableConfigControls } from "./useFileTableConfigControls";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";

type CreateReferencedColumnProps = Omit<PrglCore, "methods"> & {
  fileTable: string | undefined;
  tableName?: string;
  onClose?: VoidFunction;
};

export const CreateFileColumn = ({
  db,
  tables,
  fileTable,
  tableName: _tableName,
  onClose,
}: CreateReferencedColumnProps) => {
  const prgl = usePrgl();
  const [tableName, setTableName] = useState(_tableName);
  if (!fileTable) {
    return (
      <Popup
        title="Create file column"
        clickCatchStyle={{ opacity: 0.5 }}
        onClickClose={true}
        positioning="top-center"
        data-command="CreateFileColumn"
        onClose={onClose}
      >
        <InfoRow variant="naked">
          Must enable{" "}
          <Link
            to={`/connection-config/${prgl.connectionId}?section=file_storage`}
          >
            file storage
          </Link>{" "}
          first
        </InfoRow>
      </Popup>
    );
  }
  if (tableName) {
    return (
      <CreateFileColumnOptions
        db={db}
        tables={tables}
        fileTable={fileTable}
        tableName={tableName}
        prgl={prgl}
        onDone={() => {
          onClose?.();
          if (!_tableName) {
            setTableName(undefined);
          }
        }}
      />
    );
  }
  return (
    <Select
      value={tableName}
      className="mt-1"
      btnProps={{
        children: "Add new link",
        color: "action",
        iconPath: mdiPlus,
      }}
      fullOptions={tables
        .filter((t) => !t.info.isFileTable)
        .map((t) => ({
          key: t.name,
          disabledInfo:
            t.columns.some((c) => c.is_pkey) ?
              undefined
            : "Needs a primary key",
        }))}
      onChange={(table) => setTableName(table)}
    />
  );
};

const CreateFileColumnOptions = ({
  db,
  fileTable,
  tableName,
  onDone,
  prgl,
}: Omit<CreateReferencedColumnProps, "fileTable"> & {
  fileTable: string;
  tableName: string;
  onDone: VoidFunction;
  prgl: Prgl;
}) => {
  const [colName, setColName] = useState<string>();
  const [optional, setOptional] = useState(true);
  const {
    refsConfig,
    setRefsConfig,
    updateRefsConfig,
    canUpdateRefColumns: canUpdate,
  } = useFileTableConfigControls(prgl);
  const query =
    !tableName ? "" : (
      [
        `ALTER TABLE ${asName(tableName || "empty")} `,
        `ADD COLUMN ${asName(colName || "empty")} UUID ${!optional ? " NOT NULL " : ""} `,
        `REFERENCES ${asName(fileTable)} (id)`,
      ].join("\n")
    );
  const [error, setError] = useState<any>();

  return (
    <Popup
      title="Add new file link"
      positioning="top-center"
      clickCatchStyle={{ opacity: 0.5 }}
      data-command="CreateFileColumn"
      onClose={onDone}
      contentClassName="gap-1 p-1"
      autoFocusFirst={{ selector: "input" }}
      content={
        <>
          <FormFieldDebounced
            label="New column name"
            value={colName}
            type="text"
            onChange={(col) => setColName(col)}
          />
          <SwitchToggle
            label="Optional"
            onChange={(e) => setOptional(e)}
            checked={!!optional}
          />
          <InfoRow iconPath="">
            This column will reference the <strong>{fileTable}</strong> table
          </InfoRow>
          {colName && (
            <>
              <FileColumnConfigEditor
                columnName={colName}
                tableName={tableName}
                refsConfig={refsConfig}
                onChange={setRefsConfig}
                onSetError={setError}
              />
            </>
          )}
        </>
      }
      footerButtons={[
        { label: "Cancel", onClickClose: true },
        {
          label: "Create",
          variant: "filled",
          color: "action",
          "data-command": "CreateFileColumn.confirm",
          className: "ml-auto",
          disabledInfo:
            error ? "Must fix error"
            : !colName ? "New column name missing"
            : undefined,
          onClickMessage: async (_, setM) => {
            try {
              if (!colName) return;
              setM({ loading: 1 });
              if (!db.sql)
                throw "Not enough privileges. Must be allowed to run SQL queries";
              await db.sql(query);
              if (canUpdate) {
                updateRefsConfig();
              }
              // const newColConfig = getMergedRefFileColConfig({
              //   colConfig: { acceptedContent: "*" },
              //   columnName: colName,
              //   refsConfig,
              //   tableName
              // })
              // await updateRefsConfig(newColConfig);
              setM({ ok: "Created!" }, () => onDone());
            } catch (err) {
              setM({ err });
            }
          },
        },
      ]}
    ></Popup>
  );
};
