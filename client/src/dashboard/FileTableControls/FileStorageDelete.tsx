import React, { useState } from "react";
import type { PrglCore } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { InfoRow } from "../../components/InfoRow";
import Popup from "../../components/Popup/Popup";
import { SwitchToggle } from "../../components/SwitchToggle";
import { CodeChecker } from "../Backup/CodeConfirmation";
import { useEffectAsync } from "../DashboardMenu/DashboardMenuSettings";
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
  const [error, setError] = useState<any>();

  const [hasFiles, setHasFiles] = useState(false);
  useEffectAsync(async () => {
    const ftable = database_config.file_table_config?.fileTable;
    const hasFiles =
      ftable && db[ftable] ? Boolean(await db[ftable]?.count?.()) : false;
    setHasFiles(hasFiles);
  }, [database_config.file_table_config?.fileTable, db]);

  const isLocalType =
    database_config.file_table_config?.storageType.type === "local";

  return (
    <Popup
      title="Disable file storage"
      onClose={onClose}
      footerButtons={[
        { label: "Cancel", onClick: onClose, variant: "outline" },
        {
          node: (
            <Btn
              color="danger"
              variant="filled"
              disabledInfo={
                hasConfirmed ? undefined : "Must code confirm first"
              }
              onClickMessage={async (_, setMsg) => {
                try {
                  setMsg({ loading: 1 });
                  await dbsMethods.setFileStorage!(connection.id, undefined, {
                    keepS3Data,
                    keepFileTable,
                  });
                  setMsg({ ok: "Disabled!" }, onClose);
                } catch (error) {
                  setError(error);
                }
              }}
            >
              Disable File storage
            </Btn>
          ),
        },
      ]}
      contentClassName="flex-col gap-1  p-1"
    >
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

      <InfoRow color="warning" variant="filled">
        File storage will be disabled{" "}
      </InfoRow>

      <CodeChecker className="ai-start pl-p25" onChange={setHasConfirmed} />
      {error && <ErrorComponent error={error} />}
    </Popup>
  );
};
