import { FileTableConfig, ProstglesInitOptions } from "prostgles-server/dist/Prostgles";
import { Connections, DBS, DatabaseConfigs, MEDIA_ROUTE_PREFIX } from "..";
import { ConnectionManager } from "./ConnectionManager";
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript";
import { getCloudClient } from "../enterprise/cloudClients";
import { CloudClient } from "prostgles-server/dist/FileManager/FileManager";
import { pickKeys } from "prostgles-types";


export const getDatabaseConfigFilter = (c: Connections) => pickKeys(c, ["db_name", "db_host", "db_port"])

type ParseTableConfigArgs = {
  dbs: DBS;
  conMgr: ConnectionManager;
  con: Connections;
} & ({
  type: "saved";
  newTableConfig?: undefined
} | {
  type: "new";
  newTableConfig: DatabaseConfigs["file_table_config"];
});

export const parseTableConfig = async ({ con, conMgr, dbs, type, newTableConfig }: ParseTableConfigArgs): Promise<{
  fileTable?: FileTableConfig;
  tableConfigOk: boolean;
}> => {
  const connectionId = con.id;
  let tableConfigOk = false;
  let tableConfig: DatabaseConfigs["file_table_config"] & Pick<FileTableConfig, "referencedTables"> | null = null;
  if(type === "saved"){
    const database_config = await dbs.database_configs.findOne(getDatabaseConfigFilter(con));
    if(!database_config){
      return {
        fileTable: undefined,
        tableConfigOk: true
      }
    }
    tableConfig = database_config.file_table_config;
  } else {
    tableConfig = newTableConfig;
  }
  let cloudClient: CloudClient | undefined;
  if(tableConfig?.storageType?.type === "S3"){
    if(tableConfig.storageType.credential_id){
      const s3Creds = await dbs.credentials.findOne({ id: tableConfig?.storageType.credential_id, type: "s3" });
      if(s3Creds){
        tableConfigOk = true;
        cloudClient = getCloudClient({
          accessKeyId: s3Creds.key_id,
          secretAccessKey: s3Creds.key_secret,
          Bucket: s3Creds.bucket!,
          region: s3Creds.region!
        });
      }
    }
    if (!tableConfigOk) {
      console.error("Could not find S3 credentials for fileTable config. File storage will not be set up")
    } 
  } else if(tableConfig?.storageType?.type === "local" && tableConfig.fileTable){
    tableConfigOk = true;
  }

  const fileTable = (!tableConfig?.fileTable || !tableConfigOk)? undefined : {
    tableName: tableConfig.fileTable,
    expressApp: conMgr.app,
    fileServeRoute: `${MEDIA_ROUTE_PREFIX}/${connectionId}`,
    ...(tableConfig.storageType?.type === "local"? {
      localConfig: {
        /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
        localFolderPath: conMgr.getFileFolderPath(connectionId)
      }
    } : { cloudClient }),
    referencedTables: tableConfig.referencedTables,
  }

  return { tableConfigOk, fileTable };
}

export const getCompiledTS = (code: string) => {
  const sourceCode = ts.transpile(code, { 
    noEmit: false, 
    target: ScriptTarget.ES2022,
    lib: ["ES2022"],
    module: ModuleKind.CommonJS,
    moduleResolution: ModuleResolutionKind.NodeJs,
  }, "input.ts");

  return sourceCode;
}

export const getRestApiConfig = (conMgr: ConnectionManager, conId: string, dbConf: DatabaseConfigs) => {
  const res: ProstglesInitOptions["restApi"] = dbConf.rest_api_enabled? {
    expressApp: conMgr.app,
    routePrefix: `/rest-api/${conId}`
  } : undefined

  return res;
}

export const getTableConfig = ({ table_config, table_config_ts }: DatabaseConfigs) => {
    if(table_config) return table_config;
    if(!table_config_ts) return undefined;
    const sourceCode = getCompiledTS(table_config_ts);
    return eval(sourceCode);
}