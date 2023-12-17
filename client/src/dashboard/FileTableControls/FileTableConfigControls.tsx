
import { SQLHandler } from "prostgles-types";
import React from 'react';
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import { Prgl } from "../../App";
import Loading from "../../components/Loading"; 
import { FileTableConfigReferences } from "./FileColumnConfigControls";
import { FileStorageControls } from "./FileStorageControls";
import { FileStorageReferencedTablesConfig } from "./FileStorageReferencedTablesConfig";
import { usePromise, useSubscribeOne } from "prostgles-client/dist/react-hooks";


type FileTableConfigControlsProps = {
  prgl: Prgl;
  connectionId?: string;
  className?: string;
}

export type ConnectionTableConfig = DBSSchema["database_configs"]["file_table_config"] & {
  referencedTables?: FileTableConfigReferences["referencedTables"];
}

export const FileTableConfigControls = ({ prgl: { tables, db, dbs, dbsTables, dbsMethods, connectionId, theme } }: FileTableConfigControlsProps) => {

    const connectionFilter = {  id: connectionId };
    const connection = useSubscribeOne(dbs.connections.subscribeOneHook(connectionFilter));
    const database_config = useSubscribeOne(dbs.database_configs.subscribeOneHook({ $existsJoined: { connections: connectionFilter } }));
    
    const canCreateTables = usePromise(() => getCanCreateTables(db.sql!));
    if (!connection || !database_config) {
      return <Loading />
    }

    return <div className="flex-col gap-1 f-1 min-h-0 o-auto ">
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
        dbsMethods={dbsMethods} 
        canCreateTables={!!canCreateTables} 
        connection={connection}
        file_table_config={database_config.file_table_config}
        tables={tables} 
        db={db}
      />

    </div>
}

export const getCanCreateTables = (sql: SQLHandler): Promise<boolean> => {
  return sql(`SELECT has_database_privilege(current_database(), 'create') as yes`, {}, { returnType: "value" });
}