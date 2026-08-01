import type { DBSSchema } from "@common/publishUtils";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useCallback, useEffect, useMemo, useState } from "react";

type P = {
  connectionId: string;
  canCreateTables: boolean | undefined;
  fileConfig: DBSSchema["database_configs"]["file_table_config"] | undefined;
};

export const useSetFileStorage = ({
  connectionId,
  canCreateTables,
  fileConfig,
}: P) => {
  const { dbsMethods, tables } = usePrgl();

  const [fileTable, setFileTable] = useState(fileConfig?.fileTable);
  const [fileCitationsTable, setFileCitationsTable] = useState(
    fileConfig?.citationsTable,
  );
  const [extractText, setExtractText] = useState(
    fileConfig?.extractText ?? true,
  );

  useEffect(() => {
    setFileTable(fileConfig?.fileTable);
  }, [fileConfig?.fileTable]);

  const [storageType, setStorageType] = useState(
    fileConfig?.storageType.type ?? "local",
  );
  const [credentialId, setCredentialId] = useState(
    fileConfig?.storageType.type === "S3" ?
      fileConfig.storageType.credential_id
    : undefined,
  );

  const fileTableNameClash = tables.some(
    (t) =>
      t.name === fileTable &&
      !t.columns.some((c) => c.name === "signed_url_expires"),
  );
  const fileCitationsTableNameClash = tables.some(
    (t) =>
      t.name === fileCitationsTable &&
      !t.columns.some((c) => c.name === "citation"),
  );

  const canEnable =
    !fileConfig?.fileTable &&
    fileTable &&
    !fileTableNameClash &&
    !fileCitationsTableNameClash &&
    (storageType === "local" || !!credentialId);

  const error =
    canCreateTables ? undefined : (
      `Cannot use this feature: Your account needs CREATE TABLE privilege`
    );

  const currentConfig = useMemo(() => {
    return {
      ...fileConfig,
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
      extractText,
    } satisfies typeof fileConfig;
  }, [
    credentialId,
    extractText,
    fileCitationsTable,
    fileConfig,
    fileTable,
    storageType,
  ]);

  const setFileStorage = useCallback(
    async (update?: Partial<typeof fileConfig>) => {
      if (storageType === "S3" && !credentialId) {
        throw "storageType missing";
      }
      await dbsMethods.setFileStorage!({
        connId: connectionId,
        opts: {},
        tableConfig: {
          ...currentConfig,
          ...update,
        },
      });
    },
    [
      connectionId,
      credentialId,
      currentConfig,
      dbsMethods.setFileStorage,
      storageType,
    ],
  );

  return {
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
    extractText,
    setExtractText,
    fileTableNameClash,
    fileCitationsTableNameClash,
  };
};
