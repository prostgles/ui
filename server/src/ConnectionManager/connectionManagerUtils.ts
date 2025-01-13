import type { CloudClient } from "prostgles-server/dist/FileManager/FileManager";
import type {
  FileTableConfig,
  ProstglesInitOptions,
} from "prostgles-server/dist/ProstglesTypes";
import type { DbTableInfo } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import type { DB, OnInitReason } from "prostgles-server/dist/initProstgles";
import type { FileColumnConfig } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript";
import type { Connections, DBS, DatabaseConfigs } from "..";
import { MEDIA_ROUTE_PREFIX } from "..";
import { getCloudClient } from "../cloudClients/cloudClients";
import type { ConnectionManager } from "./ConnectionManager";
import { getConnectionPaths } from "../../../commonTypes/utils";

export const getDatabaseConfigFilter = (c: Connections) =>
  pickKeys(c, ["db_name", "db_host", "db_port"]);

type ParseTableConfigArgs = {
  dbs: DBS;
  conMgr: ConnectionManager;
  con: Connections;
} & (
  | {
      type: "saved";
      newTableConfig?: undefined;
    }
  | {
      type: "new";
      newTableConfig: DatabaseConfigs["file_table_config"];
    }
);

export const parseTableConfig = async ({
  con,
  conMgr,
  dbs,
  type,
  newTableConfig,
}: ParseTableConfigArgs): Promise<{
  fileTable?: FileTableConfig;
  tableConfigOk: boolean;
}> => {
  const connectionId = con.id;
  let tableConfigOk = false;
  let tableConfig:
    | (DatabaseConfigs["file_table_config"] &
        Pick<FileTableConfig, "referencedTables">)
    | null = null;
  if (type === "saved") {
    const database_config = await dbs.database_configs.findOne(
      getDatabaseConfigFilter(con),
    );
    if (!database_config) {
      return {
        fileTable: undefined,
        tableConfigOk: true,
      };
    }
    tableConfig = database_config.file_table_config;
  } else {
    tableConfig = newTableConfig;
  }
  let cloudClient: CloudClient | undefined;
  if (tableConfig?.storageType.type === "S3") {
    if (tableConfig.storageType.credential_id) {
      const s3Creds = await dbs.credentials.findOne({
        id: tableConfig.storageType.credential_id,
        type: "s3",
      });
      if (s3Creds) {
        tableConfigOk = true;
        cloudClient = getCloudClient({
          accessKeyId: s3Creds.key_id,
          secretAccessKey: s3Creds.key_secret,
          Bucket: s3Creds.bucket!,
          region: s3Creds.region!,
        });
      }
    }
    if (!tableConfigOk) {
      console.error(
        "Could not find S3 credentials for fileTable config. File storage will not be set up",
      );
    }
  } else if (
    tableConfig?.storageType.type === "local" &&
    tableConfig.fileTable
  ) {
    tableConfigOk = true;
  }

  const fileTable =
    !tableConfig?.fileTable || !tableConfigOk ?
      undefined
    : {
        tableName: tableConfig.fileTable,
        expressApp: conMgr.app,
        fileServeRoute: `${MEDIA_ROUTE_PREFIX}/${connectionId}`,
        ...(tableConfig.storageType.type === "local" ?
          {
            localConfig: {
              /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
              localFolderPath: await conMgr.getFileFolderPath(connectionId),
            },
          }
        : { cloudClient }),
        referencedTables: tableConfig.referencedTables,
      };

  return { tableConfigOk, fileTable };
};

export const getCompiledTS = (code: string) => {
  const sourceCode = ts.transpile(
    code,
    {
      noEmit: false,
      target: ScriptTarget.ES2022,
      lib: ["ES2022"],
      module: ModuleKind.CommonJS,
      moduleResolution: ModuleResolutionKind.Node16,
    },
    "input.ts",
  );

  return sourceCode;
};

export const getRestApiConfig = (
  conMgr: ConnectionManager,
  con: Connections,
  dbConf: DatabaseConfigs,
) => {
  const res: ProstglesInitOptions["restApi"] =
    dbConf.rest_api_enabled ?
      {
        expressApp: conMgr.app,
        routePrefix: getConnectionPaths(con).rest,
      }
    : undefined;

  return res;
};
export const getEvaledExports = (code: string) => {
  /**
   * This is needed to ensure all named exports are returned in eval
   */
  const ending = "\n\nexports;";
  const sourceCode = getCompiledTS(code + ending);
  return eval(sourceCode);
};

type TableDbConfig = Pick<DatabaseConfigs, "table_config" | "table_config_ts">;
export const getCompiledTableConfig = ({
  table_config,
  table_config_ts,
}: TableDbConfig): undefined | { tableConfig: any; dashboardConfig?: any } => {
  if (table_config) return { tableConfig: table_config };
  if (!table_config_ts) return undefined;

  const res = getEvaledExports(table_config_ts);
  if (!res.tableConfig)
    throw "A table_config_ts must export a const named 'tableConfig' ";
  return res;
};

export const getTableConfig = (dbConf: TableDbConfig) => {
  return getCompiledTableConfig(dbConf)?.tableConfig;
};

export type FileTableConfigReferences = Record<
  string,
  { referenceColumns: Record<string, FileColumnConfig> }
>;

type AlertIfReferencedFileColumnsRemovedArgs = {
  reason: OnInitReason;
  tables: DbTableInfo[];
  connId: string;
  db: DB;
};
export const alertIfReferencedFileColumnsRemoved = async function (
  this: ConnectionManager,
  { connId, reason, tables, db }: AlertIfReferencedFileColumnsRemovedArgs,
) {
  /** Remove dropped referenced file columns */
  const { dbConf, isSuperUser } = this.prglConnections[connId] ?? {};
  const referencedTables = dbConf?.file_table_config?.referencedTables as
    | FileTableConfigReferences
    | undefined;
  if (
    isSuperUser &&
    dbConf &&
    this.dbs &&
    referencedTables &&
    (reason.type === "schema change" || reason.type === "TableConfig")
  ) {
    const droppedFileColumns: { tableName: string; missingCols: string[] }[] =
      [];
    Object.entries(referencedTables).map(
      ([tableName, { referenceColumns }]) => {
        const table = tables.find((t) => t.name === tableName);
        const missingCols = Object.keys(referenceColumns).filter(
          (colName) => !table?.columns.find((c) => c.name === colName),
        );
        if (missingCols.length) {
          droppedFileColumns.push({ tableName, missingCols });
        }
      },
    );
    if (
      droppedFileColumns.length &&
      !(await this.dbs.alerts.findOne({
        database_config_id: dbConf.id,
        data: droppedFileColumns,
      }))
    ) {
      await this.dbs.alerts.insert({
        severity: "warning",
        title: "Storage columns missing",
        message: `Some file column configs are missing from database schema: ${droppedFileColumns.map(({ tableName, missingCols }) => `${tableName}: ${missingCols.join(", ")}`).join(", ")}`,
        database_config_id: dbConf.id,
        data: droppedFileColumns,
      });
    }
  }
};
