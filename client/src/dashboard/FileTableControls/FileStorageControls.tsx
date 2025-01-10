import { mdiContentSaveCogOutline } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useEffect, useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import Chip from "../../components/Chip";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexRowWrap } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import Select from "../../components/Select/Select";
import { SwitchToggle } from "../../components/SwitchToggle";
import { pickKeys } from "prostgles-types";
import { CredentialSelector } from "../Backup/CredentialSelector";
import { FileStorageDelete } from "./FileStorageDelete";
import type { FullExtraProps } from "../../pages/ProjectConnection/ProjectConnection";

const STORAGE_TYPES = [
  {
    key: "local",
    label: "Local",
    subLabel: "Files stored within the docker volume",
  },
  { key: "S3", label: "Amazon S3", subLabel: "Files stored in the cloud" },
] as const;

export type FileStorageControlsProps = Pick<
  FullExtraProps,
  "dbsMethods" | "dbTables" | "dbs" | "dbsTables" | "dbProject" | "theme"
> & {
  connection: DBSSchema["connections"];
  database_config: DBSSchema["database_configs"];
  canCreateTables?: boolean;
};

export const FileStorageControls = (props: FileStorageControlsProps) => {
  const {
    canCreateTables,
    connection,
    dbTables,
    dbs,
    dbsTables,
    theme,
    dbsMethods,
    dbProject,
    database_config,
  } = props;
  const [showDelete, setShowDelete] = useState(false);

  const fileSizes = usePromise(
    async () => ({
      projectFolderSize:
        (
          (await database_config.file_table_config?.storageType.type) ===
          "local"
        ) ?
          (dbsMethods.getFileFolderSizeInBytes?.(connection.id) as any)
        : 0,
      totalFileFolderSize:
        (
          (await database_config.file_table_config?.storageType.type) ===
          "local"
        ) ?
          (dbsMethods.getFileFolderSizeInBytes?.() as any)
        : 0,
    }),
    [database_config, connection, dbsMethods],
  );

  const { projectFolderSize = 0, totalFileFolderSize = 0 } = fileSizes ?? {};

  const fileConfig = database_config.file_table_config;
  const [fileTable, setFileTable] = useState(fileConfig?.fileTable);

  useEffect(() => {
    setFileTable(fileConfig?.fileTable);
  }, [fileConfig?.fileTable]);

  const [storageType, setStorageType] = useState(fileConfig?.storageType.type);
  const [credentialId, setCredentialId] = useState(
    fileConfig?.storageType && "credential_id" in fileConfig.storageType ?
      fileConfig.storageType.credential_id
    : undefined,
  );

  const fileTableNameClash = dbTables.some(
    (t) =>
      t.name === fileTable &&
      !t.columns.some((c) => c.name === "signed_url_expires"),
  );

  const canEnable =
    !fileConfig?.fileTable &&
    fileTable &&
    storageType &&
    (storageType === "local" || !!credentialId);

  const error =
    canCreateTables ? undefined : (
      `Cannot use this feature: Your account needs CREATE TABLE privilege`
    );
  const [enablingError, setEnablingError] = useState<any>();

  return (
    <>
      {!!showDelete && (
        <FileStorageDelete
          {...pickKeys(props, ["connection", "dbsMethods", "database_config"])}
          db={dbProject}
          onClose={() => setShowDelete(false)}
        />
      )}

      <div className=" ">
        <p className="mt-0 pt-0">
          Files can be uploaded and viewed by configuring a local or remote
          (Amazon S3) storage and designating a table within this database to
          store file urls and metadata
        </p>
        <p className="mt-3">Access to the files is controlled through: </p>
        <ul className="no-ddecor">
          <li className="py-p25">
            <strong>file table</strong> - users that are allowed to
            view/insert/delete the data within the file table can interact with
            the files
          </li>
          <li className="py-p25">
            <strong>tables that reference the file table</strong> - users that
            are allowed to view/insert/update the reference column are also
            allowed to view/insert/update the related records from the file
            table (and associated files)
          </li>
        </ul>
        {error && <InfoRow color="danger">{error}</InfoRow>}
      </div>

      <SwitchToggle
        label={
          !fileTable ? "Enable"
          : !fileConfig?.fileTable ?
            "Enabling..."
          : "Enabled"
        }
        checked={!!fileTable}
        className=""
        data-command="config.files.toggle"
        disabledInfo={error}
        onChange={(val) => {
          if (val) {
            setFileTable("files");
            setStorageType("local");
          } else {
            if (fileConfig?.fileTable) {
              setShowDelete(true);
            } else {
              setFileTable(undefined);
              setStorageType(undefined);
            }
          }
        }}
      />
      <FlexRowWrap className=" gap-1p5 ">
        {!!fileTable && (
          <>
            <FormField
              type="text"
              label={{
                label: "File table name",
                info:
                  fileConfig?.fileTable ?
                    "Table that contains file metadata"
                  : "Used for file metadata. Table created in the current database",
              }}
              readOnly={!!fileConfig?.fileTable}
              title={fileConfig?.fileTable ? "Cannot be updated" : ""}
              value={fileTable}
              onChange={setFileTable}
              error={
                fileTableNameClash ?
                  "There is a table with this name in the database. Choose another name"
                : undefined
              }
            />
          </>
        )}

        {!!fileTable && (
          <>
            {fileConfig?.fileTable ?
              <FormField
                readOnly={true}
                label="Storage type"
                value={storageType}
              />
            : <Select
                fullOptions={STORAGE_TYPES}
                label="Storage type"
                className=""
                value={storageType}
                onChange={setStorageType}
              />
            }
          </>
        )}

        {storageType === "S3" ?
          <div className="flex-row-wrap gap-2 h-fit">
            <CredentialSelector
              theme={theme}
              dbs={dbs}
              dbsMethods={dbsMethods}
              dbsTables={dbsTables}
              selectedId={credentialId}
              pickFirst={true}
              onChange={(val) => {
                setStorageType("S3");
                setCredentialId(val);
              }}
            />
          </div>
        : storageType === "local" ?
          <>
            {!!fileConfig?.fileTable && (
              <>
                <Chip
                  variant="header"
                  label="This file folder size"
                  value={
                    Math.round(
                      (projectFolderSize ?? 0) / 1e6,
                    ).toLocaleString() + " MB"
                  }
                />
                <Chip
                  variant="header"
                  label="All file folders size"
                  value={
                    Math.round(
                      (totalFileFolderSize ?? 0) / 1e6,
                    ).toLocaleString() + " MB"
                  }
                />
              </>
            )}
          </>
        : null}
      </FlexRowWrap>

      {enablingError && (
        <ErrorComponent
          variant="outlined"
          findMsg={true}
          error={enablingError}
        />
      )}

      {canEnable && (
        <div className="flex-col gap-1 mt-2 ">
          <Btn
            color="action"
            variant="filled"
            data-command="config.files.toggle.confirm"
            iconPath={mdiContentSaveCogOutline}
            onClickMessage={async (_, setMsg) => {
              try {
                setMsg({ loading: 1, duration: 10000 });
                if (storageType === "S3" && !credentialId) {
                  throw "storageType missing";
                }
                await dbsMethods.setFileStorage!(connection.id, {
                  fileTable,
                  storageType:
                    storageType === "local" ?
                      {
                        type: storageType,
                      }
                    : {
                        type: storageType,
                        credential_id: credentialId!,
                      },
                });
              } catch (err) {
                setEnablingError(err);
              }
            }}
          >
            Enable file storage
          </Btn>
        </div>
      )}
    </>
  );
};
