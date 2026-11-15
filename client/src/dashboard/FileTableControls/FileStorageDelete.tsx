import ErrorComponent from "@components/ErrorComponent";
import { InfoRow } from "@components/InfoRow";
import Popup from "@components/Popup/Popup";
import { SwitchToggle } from "@components/SwitchToggle";
import { usePromise } from "prostgles-client";
import React, { useState } from "react";
import type { PrglCore } from "../../App";
import { CodeChecker } from "../BackupAndRestore/CodeConfirmation";
import type { FileStorageControlsProps } from "./FileStorageControls";

type P = Pick<
  FileStorageControlsProps,
  "connection" | "dbsMethods" | "database_config"
> & {
  onClose: VoidFunction;
  db: PrglCore["db"];
};

export const FileStorageDelete = ({
  dbsMethods,
  connection,
  db,
  onClose,
  database_config,
}: P) => {
  const [keepS3Data, setkeepS3Data] = useState(false);
  const [keepFileTable, setkeepFileTable] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [error, setError] = useState<unknown>();

  const hasFiles = usePromise(async () => {
    const ftable = database_config.file_table_config?.fileTable;
    const hasFiles =
      ftable && db[ftable] ? Boolean(await db[ftable].count?.()) : false;
    return hasFiles;
  }, [database_config.file_table_config?.fileTable, db]);

  const isLocalType =
    database_config.file_table_config?.storageType.type === "local";

  return (
    <Popup
      title="Disable file storage"
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
      footerButtons={[
        { label: "Cancel", onClick: onClose, variant: "outline" },
        {
          label: "Disable file storage",
          color: "danger",
          variant: "filled",
          disabledInfo: hasConfirmed ? undefined : "Must code confirm first",
          onClickMessage: async (_, setMsg) => {
            try {
              setMsg({ loading: 1 });
              await dbsMethods.setFileStorage!({
                connId: connection.id,
                tableConfig: undefined,
                opts: {
                  keepS3Data,
                  keepFileTable,
                },
              });
              setMsg({ ok: "Disabled!" }, onClose);
            } catch (error) {
              setError(error);
            }
          },
        },
      ]}
      contentClassName="flex-col gap-1  p-1"
    >
      <div>
        Choose what to do with the existing file storage data. You can keep the
        file table and/or the files in S3, or delete both.
      </div>
      <SwitchToggle
        label={`Keep the ${database_config.file_table_config?.fileTable} table`}
        checked={keepFileTable}
        onChange={setkeepFileTable}
        disabledInfo={hasFiles ? undefined : "No files"}
      />

      <SwitchToggle
        label="Keep existing files"
        checked={keepS3Data && !isLocalType}
        onChange={isLocalType ? () => {} : setkeepS3Data}
        disabledInfo={
          !hasFiles ? "No files"
          : isLocalType ?
            "Local files cannot be kept"
          : undefined
        }
      />

      {hasFiles && (
        <InfoRow color={"danger"} variant="filled">
          Data will be permanently deleted{" "}
        </InfoRow>
      )}

      <CodeChecker className="ai-start pl-p25" onChange={setHasConfirmed} />
      <ErrorComponent error={error} />
    </Popup>
  );
};
