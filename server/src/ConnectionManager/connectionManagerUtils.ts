import { getConnectionApiPaths } from "@common/utils";
import type e from "express";
import type { TableConfig } from "prostgles-server";
import type { DB, OnInitReason } from "prostgles-server/dist/initProstgles";
import type { ProstglesInitOptions } from "prostgles-server/dist/ProstglesTypes";
import type { FileColumnConfig, TableSchema } from "prostgles-types";
import { pickKeys } from "prostgles-types";
import ts, { ModuleKind, ModuleResolutionKind, ScriptTarget } from "typescript";
import type { DatabaseConfigs } from "..";
import type { ConnectionManager } from "./ConnectionManager";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";
import { getSchemaConfig } from "./getSchemaConfig";

export const getDatabaseConfigFilter = (c: ConnectionHotReloadProperties) =>
  pickKeys(c, ["db_name", "db_host", "db_port"]);

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

export const getRestApiConfig = (
  expressApp: e.Express,
  con: ConnectionHotReloadProperties,
  { rest_api_enabled }: Pick<DatabaseConfigs, "rest_api_enabled">,
) => {
  const res: ProstglesInitOptions["restApi"] =
    rest_api_enabled ?
      {
        expressApp,
        path: getConnectionApiPaths(con).rest,
      }
    : undefined;

  return res;
};

type TableDbConfig = Pick<
  DatabaseConfigs,
  "table_config" | "table_config_ts" | "config_sync"
>;
type CompiledTableConfig = { tableConfig: TableConfig; dashboardConfig?: any };

const getCompiledTableConfig = ({
  table_config,
  table_config_ts,
}: TableDbConfig): undefined | CompiledTableConfig => {
  if (table_config) return { tableConfig: table_config as TableConfig };
  if (!table_config_ts) return undefined;

  const res = getEvaledExports<CompiledTableConfig>(table_config_ts);
  if (!res?.tableConfig) {
    throw "A table_config_ts must export a const named 'tableConfig' ";
  }
  return res;
};

export const getTableConfig = (dbConf: TableDbConfig) => {
  const schemaConfig = getSchemaConfig(dbConf.config_sync)?.config;
  if (schemaConfig) {
    return schemaConfig.tableConfig;
  }
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
