import { useIsMounted, usePromise } from "prostgles-client/dist/react-hooks";
import type { SQLHandler } from "prostgles-types";
import React, { useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { type Prgl } from "../../App";
import Loading from "../../components/Loading";
import type { FileTableConfigReferences } from "./FileColumnConfigControls";
import { FileStorageControls } from "./FileStorageControls";
import { FileStorageReferencedTablesConfig } from "./FileStorageReferencedTablesConfig";
import { useFileTableConfigControls } from "./useFileTableConfigControls";

type FileTableConfigControlsProps = {
  prgl: Prgl;
  connectionId?: string;
  className?: string;
};

export type ConnectionTableConfig =
  DBSSchema["database_configs"]["file_table_config"] & {
    referencedTables?: FileTableConfigReferences["referencedTables"];
  };

export const FileTableConfigControls = ({
  prgl,
}: FileTableConfigControlsProps) => {
  const { tables, db, dbs, dbsTables, dbsMethods, connectionId, theme } = prgl;
  const {
    connection,
    database_config,
    canCreateTables,
    setRefsConfig,
    updateRefsConfig,
    refsConfig,
    canUpdateRefColumns: canUpdate,
  } = useFileTableConfigControls(prgl);
  if (!connection || !database_config) {
    return <Loading />;
  }

  return (
    <div className="flex-col gap-1 f-1 min-h-0 o-auto ">
      <FileStorageControls
        canCreateTables={canCreateTables}
        connection={connection}
        database_config={database_config}
        dbTables={tables}
        dbsMethods={dbsMethods}
        dbs={dbs}
        dbsTables={dbsTables}
        dbProject={db}
        theme={theme}
      />

      <FileStorageReferencedTablesConfig
        setRefsConfig={setRefsConfig}
        updateRefsConfig={updateRefsConfig}
        canCreateTables={!!canCreateTables}
        canUpdateRefColumns={canUpdate}
        refsConfig={refsConfig}
        file_table_config={database_config.file_table_config}
        tables={tables}
        db={db}
        prgl={prgl}
      />
    </div>
  );
};

export const getCanCreateTables = (sql: SQLHandler): Promise<boolean> => {
  return sql(
    `SELECT has_database_privilege(current_database(), 'create') as yes`,
    {},
    { returnType: "value" },
  );
};
