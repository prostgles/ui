import { mdiFileCogOutline } from "@mdi/js";
import { useIsMounted } from "prostgles-client/dist/react-hooks";
import React, { useState } from "react";
import { type Prgl } from "../../../../App";
import Btn from "../../../../components/Btn";
import PopupMenu from "../../../../components/PopupMenu";
import { FileColumnConfigEditor } from "../../../FileTableControls/FileColumnConfigEditor";
import { useFileTableConfigControls } from "../../../FileTableControls/useFileTableConfigControls";

type P = Pick<Prgl, "db" | "tables" | "dbsMethods" | "dbs" | "connectionId"> & {
  tableName: string;
  columnName: string;
};

export const AlterColumnFileOptions = ({
  columnName,
  tableName,
  tables,
  db,
  dbs,
  dbsMethods,
  connectionId,
}: P) => {
  const table = tables.find((t) => t.name === tableName);
  const column = table?.columns.find((c) => c.name === columnName);
  const {
    connection,
    database_config,
    refsConfig,
    setRefsConfig,
    updateRefsConfig,
    canUpdateRefColumns: canUpdate,
  } = useFileTableConfigControls({ connectionId, db, dbs, dbsMethods });
  const getIsMounted = useIsMounted();
  const [error, setError] = useState<any>();
  if (!column?.file || !connectionId || !connection || !database_config)
    return null;

  return (
    <PopupMenu
      button={
        <Btn iconPath={mdiFileCogOutline} color="action" variant="faded">
          Allowed files...
        </Btn>
      }
      render={(pClose) => (
        <FileColumnConfigEditor
          columnName={columnName}
          tableName={tableName}
          refsConfig={refsConfig}
          onChange={setRefsConfig}
          onSetError={setError}
        />
      )}
      footerButtons={(pClose) => [
        {
          label: "Cancel",
          onClick: (e) => {
            setRefsConfig(undefined);
            pClose?.(e);
          },
        },
        {
          label: "Save",
          color: "action",
          variant: "filled",
          disabledInfo:
            error ? "Must fix error"
            : !canUpdate ? "No changes"
            : undefined,
          onClickPromise: async (e) => {
            await updateRefsConfig();
            if (!getIsMounted()) return;
            pClose?.(e);
          },
        },
      ]}
    />
  );
};
