import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { Label } from "@components/Label";
import { Select } from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiContentSaveCogOutline } from "@mdi/js";
import { usePromise } from "prostgles-client";
import { pickKeys } from "prostgles-types";
import React, { useState } from "react";
import type { FullExtraProps } from "../../pages/ProjectConnection/ProjectConnection";
import { bytesToSize } from "../BackupAndRestore/BackupsControls";
import { CloudStorageCredentialSelector } from "../BackupAndRestore/CloudStorageCredentialSelector";
import { FileStorageDelete } from "./FileStorageDelete";
import { useSetFileStorage } from "./hooks/useSetFileStorage";

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
  "dbsMethods" | "dbs" | "dbProject"
> & {
  connection: DBSSchema["connections"];
  database_config: DBSSchema["database_configs"];
  canCreateTables?: boolean;
};

export const FileStorageControls = (props: FileStorageControlsProps) => {
  const {
    canCreateTables,
    connection,
    dbsMethods,
    dbProject,
    database_config,
  } = props;
  const { toggleService } = dbsMethods;

  const fileConfig = database_config.file_table_config;

  const [showDelete, setShowDelete] = useState(false);

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

  const {
    setFileStorage,
    error,
    canEnable,
    storageType,
    setStorageType,
    credentialId,
    setCredentialId,
    fileTable,
    setFileTable,
    fileCitationsTable,
    setFileCitationsTable,
    fileTableNameClash,
    fileCitationsTableNameClash,
    extractText,
    setExtractText,
  } = useSetFileStorage({
    canCreateTables,
    connectionId: connection.id,
    fileConfig,
  });

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
        onChange={(enable) => {
          if (enable) {
            setFileTable("files");
            setFileCitationsTable("file_citations");
            setStorageType("local");
          } else {
            if (fileConfig?.fileTable) {
              setShowDelete(true);
            } else {
              setFileTable(undefined);
              setFileCitationsTable(undefined);
              setStorageType("local");
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
            <SwitchToggle
              label={"Extract text from documents using Docling"}
              variant="col"
              checked={extractText}
              disabledInfo={
                toggleService ? undefined : "Not allowed to start/stop services"
              }
              onChange={async (val) => {
                if (val) {
                  await toggleService?.({
                    enable: true,
                    serviceName: "documents",
                  });
                }
                if (fileConfig) {
                  await setFileStorage({ extractText: val });
                } else {
                  setExtractText(val);
                }
              }}
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
      : <>
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
      }

      {canEnable && (
        <div className="flex-col gap-1 mt-2 ">
          <Btn
            color="action"
            variant="filled"
            data-command="config.files.toggle.confirm"
            size="default"
            iconPath={mdiContentSaveCogOutline}
            onClickPromise={async () => {
              await setFileStorage();
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
