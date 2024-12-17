import { useIsMounted, usePromise } from "prostgles-client/dist/react-hooks";
import type { Prgl } from "../../App";
import { getCanCreateTables } from "./FileTableConfigControls";
import { useState } from "react";
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
  const getIsMounted = useIsMounted();
  const updateRefsConfig = async (newRefs?: FileTableConfigReferences) => {
    await dbsMethods.setFileStorage!(connectionId, {
      referencedTables: newRefs ?? refsConfig,
    });
    if (!getIsMounted()) return;
    setRefsConfig(undefined);
  };
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
