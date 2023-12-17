import React, { useState } from "react";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import { PrglCore } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import { FullExtraProps } from "../../pages/Project";
import { CreateReferencedColumn } from "./CreateReferencedColumn";
import { FileColumnConfigControls, FileTableConfigReferences } from "./FileColumnConfigControls";

type FileStorageReferencedTablesConfigProps = Pick<PrglCore, "tables" | "db"> & Pick<FullExtraProps, "dbsMethods"> & {
  canCreateTables: boolean;
  connection: DBSSchema["connections"];
  file_table_config: DBSSchema["database_configs"]["file_table_config"];
}

export const FileStorageReferencedTablesConfig = ({ connection, file_table_config, tables, db, dbsMethods }: FileStorageReferencedTablesConfigProps) => {
  const tc = file_table_config;

  
  
  const [refsConfig, setRefsConfig] = useState<FileTableConfigReferences | undefined>(tc?.referencedTables) ;
  const canUpdate = JSON.stringify(tc?.referencedTables) !== JSON.stringify(refsConfig)
  // const disabledInfo= tc?.fileTable ? (canCreateTables ? undefined : "Your account does not have CREATE privileges") : "Need to configure file table first";

  if(!tc?.fileTable) return null;
  return <FlexCol
    className="f-1 mt-2"
    
    // contentClassName="pl-1 f-1 min-h-0 flex-col pb-2"
  >
    <h3 className="m-0 p-0">Referenced column limits</h3>
    <div>
      <p className="p-0 m-0">The following tables have columns that reference the file table <strong>{tc.fileTable}</strong></p>
      <p className="p-0 m-0">Specify allowed file types and sizes as desired. By default any file type is allowed </p>
    </div>
    <FileColumnConfigControls 
      tables={tables}
      refsConfig={refsConfig}
      onChange={setRefsConfig}
    />
    <CreateReferencedColumn 
      db={db} 
      tables={tables} 
      file_table_config={file_table_config}
    />
    
    {canUpdate && <div className="my-1">
      <Btn 
        variant="filled" 
        color="action" 
        onClickMessage={async (_, setMsg) => {
          setMsg({ loading: 1 });
          try {
            await dbsMethods.setFileStorage!(connection.id, { referencedTables: refsConfig });
            setMsg({ ok: "Updated!"})
            setTimeout(() => {
              location.reload()
            }, 500)
          } catch(err) {
            setMsg({ err })
          }
        }}
      >Update column configurations</Btn>
    </div>}
  </FlexCol>
}