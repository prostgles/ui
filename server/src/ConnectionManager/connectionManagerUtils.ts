import { getConnectionApiPaths, ROUTES } from "@common/utils";
import type e from "express";
import type { CloudClient } from "prostgles-server/dist/FileManager/FileManager";
import type {
  FileTableConfig,
  ProstglesInitOptions,
} from "prostgles-server/dist/ProstglesTypes";
import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { DB, OnInitReason } from "prostgles-server/dist/initProstgles";
import type { FileColumnConfig, TableSchema } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript";
import type { DatabaseConfigs, DBS } from "..";
import { getCloudClient } from "../cloudClients/cloudClients";
import type { ConnectionManager } from "./ConnectionManager";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";

export const getDatabaseConfigFilter = (c: ConnectionHotReloadProperties) =>
  pickKeys(c, ["db_name", "db_host", "db_port"]);

type ParseTableConfigArgs = {
  dbs: DBS;
  conMgr: ConnectionManager;
  app: e.Express;
  con: ConnectionHotReloadProperties;
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
  app,
  dbs,
  type,
  newTableConfig,
}: ParseTableConfigArgs): Promise<{
  fileTable?: FileTableConfig;
  tableConfig: TableConfig | undefined;
  tableConfigOk: boolean;
}> => {
  const connectionId = con.id;
  let tableConfigOk = false;
  let fileTableConfig:
    | (DatabaseConfigs["file_table_config"] &
        Pick<FileTableConfig, "referencedTables">)
    | null = null;
  if (type === "saved") {
    const database_config = await dbs.database_configs.findOne(
      getDatabaseConfigFilter(con),
    );
    if (!database_config) {
      return {
        tableConfig: undefined,
        fileTable: undefined,
        tableConfigOk: true,
      };
    }
    fileTableConfig = database_config.file_table_config;
  } else {
    fileTableConfig = newTableConfig;
  }
  let cloudClient: CloudClient | undefined;
  if (fileTableConfig && fileTableConfig.storageType.type !== "local") {
    if (fileTableConfig.storageType.credential_id) {
      const s3Credentials = await dbs.credentials.findOne({
        id: fileTableConfig.storageType.credential_id,
      });
      if (s3Credentials) {
        tableConfigOk = true;
        cloudClient = getCloudClient({
          accessKeyId: s3Credentials.key_id,
          secretAccessKey: s3Credentials.key_secret,
          Bucket: s3Credentials.bucket!,
          region: s3Credentials.region || "auto",
          endpoint: s3Credentials.endpoint_url,
        });
      }
    }
    if (!tableConfigOk) {
      console.error(
        "Could not find cloud credentials for fileTable config. File storage will not be set up ",
      );
    }
  } else if (
    fileTableConfig?.storageType.type === "local" &&
    fileTableConfig.fileTable
  ) {
    tableConfigOk = true;
  }

  const fileTable =
    !fileTableConfig?.fileTable || !tableConfigOk ?
      undefined
    : ({
        tableName: fileTableConfig.fileTable,
        expressApp: app,
        fileServePath: `${ROUTES.STORAGE}/${connectionId}`,
        ...(fileTableConfig.storageType.type === "local" ?
          {
            localConfig: {
              /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
              localFolderPath: conMgr.getFileFolderPath(connectionId),
            },
          }
        : { cloudClient }),
        referencedTables: fileTableConfig.referencedTables,
      } satisfies FileTableConfig);

  return {
    tableConfigOk,
    fileTable,
    tableConfig:
      fileTable && fileTableConfig?.citationsTable ?
        {
          [fileTableConfig.citationsTable]: {
            columns: {
              id: ``,
              file_id: `UUID REFERENCES ${fileTableConfig.fileTable}(id) ON DELETE CASCADE`,
              citation: `TEXT NOT NULL`,
              position: `JSONB NOT NULL`,
            },
          },
        }
      : undefined,
  };
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
  app: e.Express,
  con: ConnectionHotReloadProperties,
  { rest_api_enabled }: Pick<DatabaseConfigs, "rest_api_enabled">,
) => {
  const res: ProstglesInitOptions["restApi"] =
    rest_api_enabled ?
      {
        expressApp: app,
        path: getConnectionApiPaths(con).rest,
      }
    : undefined;

  return res;
};
export const getEvaledExports = <T>(
  code: string | undefined,
): T | undefined => {
  if (!code) return undefined;
  /**
   * This is needed to ensure all named exports are returned in eval
   */
  const ending = "\n\nexports;";
  const sourceCode = getCompiledTS(code + ending);
  // eslint-disable-next-line security/detect-eval-with-expression
  const result = eval(sourceCode) as T;
  return result;
};

type TableDbConfig = Pick<DatabaseConfigs, "table_config" | "table_config_ts">;
type CompiledTableConfig = { tableConfig: TableConfig; dashboardConfig?: any };
const getCompiledTableConfig = ({
  table_config,
  table_config_ts,
}: TableDbConfig): undefined | CompiledTableConfig => {
  if (table_config) return { tableConfig: table_config as TableConfig };
  if (!table_config_ts) return undefined;

  const res = getEvaledExports<CompiledTableConfig>(table_config_ts);
  if (!res?.tableConfig)
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
  tables: TableSchema[];
  connId: string;
  db: DB;
};
export const alertIfReferencedFileColumnsRemoved = async function (
  this: ConnectionManager,
  { connId, reason, tables }: AlertIfReferencedFileColumnsRemovedArgs,
) {
  /** Remove dropped referenced file columns */
  const { dbConf, isSuperUser } =
    this.getActiveConnectionSilentFail(connId) ?? {};
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
        ui_path: {
          page: "/connection-config",
          section: "file_storage",
        },
      });
    }
  }
};
