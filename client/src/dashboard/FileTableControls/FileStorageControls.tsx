import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { Select } from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiContentSaveCogOutline } from "@mdi/js";
import { usePromise } from "prostgles-client";
import { pickKeys } from "prostgles-types";
import React, { useEffect, useState } from "react";
import type { FullExtraProps } from "../../pages/ProjectConnection/ProjectConnection";
import { CloudStorageCredentialSelector } from "../BackupAndRestore/CloudStorageCredentialSelector";
import { FileStorageDelete } from "./FileStorageDelete";
import { bytesToSize } from "../BackupAndRestore/BackupsControls";
import { Label } from "@components/Label";

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
  "dbsMethods" | "dbTables" | "dbs" | "dbsTables" | "dbProject"
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
    dbsMethods,
    dbProject,
    database_config,
  } = props;
  const [showDelete, setShowDelete] = useState(false);
  const fileConfig = database_config.file_table_config;

  const fileSizes = usePromise(async () => {
    if (fileConfig?.storageType.type !== "local") {
      return;
    }
    const projectFolder = await dbsMethods.getFileFolderSizeInBytes?.({
      conId: connection.id,
    });
    const rootFolder = await dbsMethods.getFileFolderSizeInBytes?.({});
    return { projectFolder, rootFolder };
  }, [fileConfig?.storageType.type, dbsMethods, connection.id]);

  const [fileTable, setFileTable] = useState(fileConfig?.fileTable);
  const [fileCitationsTable, setFileCitationsTable] = useState(
    fileConfig?.citationsTable,
  );

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
  const fileCitationsTableNameClash = dbTables.some(
    (t) =>
      t.name === fileCitationsTable &&
      !t.columns.some((c) => c.name === "citation"),
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
  return (
    <>
      {showDelete && (
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
        <ul>
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
            "Enable"
          : "Enabled"
        }
        variant="col"
        checked={!!fileTable}
        className=""
        data-command="config.files.toggle"
        disabledInfo={error}
        onChange={(val) => {
          if (val) {
            setFileTable("files");
            setFileCitationsTable("file_citations");
            setStorageType("local");
          } else {
            if (fileConfig?.fileTable) {
              setShowDelete(true);
            } else {
              setFileTable(undefined);
              setFileCitationsTable(undefined);
              setStorageType(undefined);
            }
          }
        }}
      />
      <FlexRowWrap className=" gap-1p5 ">
        {Boolean(fileTable) && (
          <>
            <FormField
              type="text"
              label={{
                label: "File table name",
                style: {
                  marginBottom: "0",
                },
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
            <FormField
              type="text"
              label={{
                label: "File citations table name",
                style: {
                  marginBottom: "0",
                },
                info: "Used for pdf/image file citations. Table created in the current database",
              }}
              readOnly={!!fileConfig?.fileTable}
              title={fileConfig?.fileTable ? "Cannot be updated" : ""}
              value={fileCitationsTable}
              onChange={setFileCitationsTable}
              error={
                fileCitationsTableNameClash ?
                  "There is a table with this name in the database. Choose another name"
                : undefined
              }
            />
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
                btnProps={{ size: "default" }}
              />
            }
          </>
        )}
      </FlexRowWrap>

      {storageType === "S3" ?
        <div className="flex-row-wrap gap-2 h-fit">
          <CloudStorageCredentialSelector
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
          {Boolean(fileSizes) && (
            <>
              {fileSizes?.rootFolder && (
                <LocalStorageInfo
                  title="Root folder"
                  {...fileSizes.rootFolder}
                />
              )}
              {fileSizes?.projectFolder && (
                <LocalStorageInfo
                  title="Project folder"
                  {...fileSizes.projectFolder}
                />
              )}
            </>
          )}
        </>
      : null}

      {canEnable && (
        <div className="flex-col gap-1 mt-2 ">
          <Btn
            color="action"
            variant="filled"
            data-command="config.files.toggle.confirm"
            size="default"
            iconPath={mdiContentSaveCogOutline}
            onClickPromise={async () => {
              if (storageType === "S3" && !credentialId) {
                throw "storageType missing";
              }
              await dbsMethods.setFileStorage!({
                connId: connection.id,
                opts: {},
                tableConfig: {
                  fileTable,
                  citationsTable: fileCitationsTable,
                  storageType:
                    storageType === "local" ?
                      {
                        type: storageType,
                      }
                    : {
                        type: storageType,
                        credential_id: credentialId!,
                      },
                },
              });
            }}
          >
            Enable file storage
          </Btn>
        </div>
      )}
    </>
  );
};

const LocalStorageInfo = ({
  title,
  storagePath,
  size,
}: {
  title: string;
  storagePath: string;
  size: number;
}) => (
  <FlexCol className="gap-p25">
    <Label variant="normal" label={title} />
    <div className="bold">{bytesToSize(size)}</div>
    <div>{storagePath}</div>
  </FlexCol>
);
