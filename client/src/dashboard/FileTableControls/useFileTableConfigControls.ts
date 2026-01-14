import { useIsMounted, usePromise } from "prostgles-client";
import type { Prgl } from "../../App";
import { getCanCreateTables } from "./FileTableConfigControls";
import { useCallback, useState } from "react";
import type { FileTableConfigReferences } from "./FileColumnConfigControls";

export type UseFileTableConfigControlsArgs = Pick<
  Prgl,
  "dbs" | "db" | "connectionId" | "dbsMethods"
>;
export const useFileTableConfigControls = ({
  dbs,
  db,
  dbsMethods,
  connectionId,
}: UseFileTableConfigControlsArgs) => {
  const connectionFilter = { id: connectionId };
  const { data: connection } =
    dbs.connections.useSubscribeOne(connectionFilter);
  const { data: database_config } = dbs.database_configs.useSubscribeOne({
    $existsJoined: { connections: connectionFilter },
  });

  const canCreateTables = usePromise(() => getCanCreateTables(db.sql!));
  const savedRefsConfig: FileTableConfigReferences =
    database_config?.file_table_config?.referencedTables ?? {};

  const [localRefsConfig, setRefsConfig] =
    useState<FileTableConfigReferences>();
  const refsConfig = localRefsConfig ?? savedRefsConfig;
  const { storageType, delayedDelete, fileTable } =
    database_config?.file_table_config || {};
  const getIsMounted = useIsMounted();
  const updateRefsConfig = useCallback(
    async (newRefs?: FileTableConfigReferences) => {
      await dbsMethods.setFileStorage!({
        connId: connectionId,
        tableConfig: storageType && {
          fileTable,
          delayedDelete,
          storageType,
          referencedTables: newRefs ?? refsConfig,
        },
      });
      if (!getIsMounted()) return;
      setRefsConfig(undefined);
    },
    [
      dbsMethods.setFileStorage,
      connectionId,
      storageType,
      fileTable,
      delayedDelete,
      refsConfig,
      getIsMounted,
    ],
  );
  const canUpdateRefColumns =
    JSON.stringify(savedRefsConfig) !== JSON.stringify(refsConfig);

  return {
    connection,
    database_config,
    canCreateTables,
    refsConfig,
    updateRefsConfig,
    canUpdateRefColumns,
    setRefsConfig,
  };
};
