import {
  annotationsTableColumns,
  fileTableExtractionColumns,
} from "@common/managedTableSchema";
import { getFileServePath } from "@common/utils";
import type { ProstglesContext, SchemaConfigDatabase } from "@src/schemaConfig";
import type e from "express";
import type { TableConfig, TableHooks } from "prostgles-server";
import { getLocalStorageClient } from "prostgles-server";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import type { StorageClient } from "prostgles-server/dist/StorageClient/StorageClientTypes";
import type { DatabaseConfigs, DBS } from "..";
import { getCloudClient } from "../cloudClients/cloudClients";
import type { ConnectionManager } from "./ConnectionManager";
import { getFilesTableHook } from "./getFilesTableHook";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";
import { getSchemaConfig } from "./getSchemaConfig";

type ParseTableConfigArgs = {
  dbs: DBS;
  conMgr: ConnectionManager;
  app: e.Express;
  con: ConnectionHotReloadProperties;
  databaseConfig: DatabaseConfigs;
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
  databaseConfig,
}: ParseTableConfigArgs): Promise<{
  fileTable?: FileTableConfig;
  tableConfig: TableConfig | undefined;
  tableHooks: TableHooks<void, ProstglesContext> | undefined;
}> => {
  const connectionId = con.id;
  let fileTableConfig:
    | (NonNullable<SchemaConfigDatabase["file_table_config"]> &
        Pick<FileTableConfig, "referencedTables">)
    | null
    | undefined = null;
  if (type === "saved") {
    fileTableConfig = databaseConfig.file_table_config;
  } else {
    fileTableConfig = newTableConfig;
  }
  let storageClient: StorageClient | undefined;
  if (fileTableConfig?.storageType.type === "local") {
    storageClient = getLocalStorageClient({
      /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
      localFolderPath: conMgr.getFileFolderPath(connectionId),
    });
  } else if (fileTableConfig?.storageType.credential_id) {
    const s3Credentials = await dbs.credentials.findOne({
      id: fileTableConfig.storageType.credential_id,
    });
    if (s3Credentials) {
      storageClient = getCloudClient({
        accessKeyId: s3Credentials.key_id,
        secretAccessKey: s3Credentials.key_secret,
        Bucket: s3Credentials.bucket!,
        region: s3Credentials.region || "auto",
        endpoint: s3Credentials.endpoint_url,
      });
    }
  } else if (fileTableConfig) {
    console.error(
      "Could not find cloud credentials for fileTable config. File storage will not be set up ",
    );
  }

  const fileTable =
    !fileTableConfig?.fileTable || !storageClient ?
      undefined
    : ({
        expressApp: app,
        tableName: fileTableConfig.fileTable,
        fileServePath: getFileServePath({ connectionId, fileId: undefined }),
        storageClient,
        referencedTables: fileTableConfig.referencedTables,
        versioning: fileTableConfig.versioning,
      } satisfies FileTableConfig);

  const { tableHooks, tableConfig } =
    getSchemaConfig(databaseConfig.config_sync)?.config ?? {};
  // Preserve extraction for existing annotation configs unless explicitly disabled.
  const extractText =
    fileTableConfig?.extractText ?? !!fileTableConfig?.annotationsTable;
  const fileTableHooksMerged: TableHooks<void, ProstglesContext> | undefined =
    fileTable && extractText ?
      getFilesTableHook(
        fileTable.tableName,
        fileTableConfig?.extractTextOptions,
      )
    : undefined;
  const fileTableConfigMerged: TableConfig | undefined =
    fileTable && (extractText || fileTableConfig?.annotationsTable) ?
      {
        [fileTable.tableName]: fileTableExtractionColumns,
      }
    : undefined;
  if (fileTableConfigMerged && fileTableConfig?.annotationsTable) {
    fileTableConfigMerged[fileTableConfig.annotationsTable] = {
      columns: annotationsTableColumns,
      constraints: {
        references_file_table:
          "FOREIGN KEY (file_id) REFERENCES " +
          fileTableConfig.fileTable +
          "(id) ON DELETE CASCADE",
      },
    };
  }
  const sourceTableConfig = (fileTableConfigMerged || tableConfig) && {
    ...(fileTableConfigMerged || {}),
    ...tableConfig,
  };
  const mergedTableHooks = mergeTableHooks(fileTableHooksMerged, tableHooks);

  return {
    fileTable,
    tableConfig: sourceTableConfig,
    tableHooks: mergedTableHooks,
  };
};

const mergeTableHooks = (
  ...hookSets: (TableHooks<void, ProstglesContext> | undefined)[]
): TableHooks<void, ProstglesContext> | undefined => {
  const result: TableHooks<void, ProstglesContext> = {};
  for (const hooks of hookSets) {
    for (const [tableName, tableHooks] of Object.entries(hooks ?? {})) {
      const existing = result[tableName];
      result[tableName] = {
        ...existing,
        ...tableHooks,
        beforeEach:
          existing?.beforeEach || tableHooks.beforeEach ?
            [...(existing?.beforeEach ?? []), ...(tableHooks.beforeEach ?? [])]
          : undefined,
        afterEach:
          existing?.afterEach || tableHooks.afterEach ?
            [...(existing?.afterEach ?? []), ...(tableHooks.afterEach ?? [])]
          : undefined,
        afterAll:
          existing?.afterAll || tableHooks.afterAll ?
            [...(existing?.afterAll ?? []), ...(tableHooks.afterAll ?? [])]
          : undefined,
      };
    }
  }
  return Object.keys(result).length ? result : undefined;
};
