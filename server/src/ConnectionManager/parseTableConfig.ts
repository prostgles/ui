import { ROUTES } from "@common/utils";
import type e from "express";
import { getLocalStorageClient } from "prostgles-server";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import type { TableConfig } from "prostgles-server";
import type { DatabaseConfigs, DBS } from "..";
import { getCloudClient } from "../cloudClients/cloudClients";
import type { ConnectionManager } from "./ConnectionManager";
import { getDatabaseConfigFilter } from "./connectionManagerUtils";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";
import type { StorageClient } from "prostgles-server/dist/StorageClient/StorageClientTypes";

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
}> => {
  const connectionId = con.id;
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
      };
    }
    fileTableConfig = database_config.file_table_config;
  } else {
    fileTableConfig = newTableConfig;
  }
  let storageClient: StorageClient | undefined;
  if (fileTableConfig) {
    if (fileTableConfig.storageType.type === "local") {
      storageClient = getLocalStorageClient({
        /* Use path.resolve when using a relative path. Otherwise will get 403 forbidden */
        localFolderPath: conMgr.getFileFolderPath(connectionId),
      });
    } else if (fileTableConfig.storageType.credential_id) {
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
    } else {
      console.error(
        "Could not find cloud credentials for fileTable config. File storage will not be set up ",
      );
    }
  }

  const fileTable =
    !fileTableConfig?.fileTable || !storageClient ?
      undefined
    : ({
        expressApp: app,
        tableName: fileTableConfig.fileTable,
        fileServePath: `${ROUTES.STORAGE}/${connectionId}`,
        storageClient,
        referencedTables: fileTableConfig.referencedTables,
      } satisfies FileTableConfig);

  return {
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
