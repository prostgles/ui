import type { ConnectionTableConfig } from "@src/ConnectionManager/ConnectionManager";
import { pickKeys } from "prostgles-types";
import { connectionManager, type DBS } from "..";
import { getConnectionAndDatabaseConfig } from "./getConnectionAndDatabaseConfig";

export const setFileStorage = async (
  dbs: DBS,
  connId: string,
  fileTableConfig?: ConnectionTableConfig,
  opts?: { keepS3Data?: boolean; keepFileTable?: boolean },
) => {
  const { db, dbConf } = await getConnectionAndDatabaseConfig(dbs, connId);

  let newTableConfig: ConnectionTableConfig | null =
    fileTableConfig ?
      {
        ...fileTableConfig,
      }
    : null;

  const existingFileTableConfig = dbConf.file_table_config;
  /** Enable file storage */
  if (fileTableConfig) {
    if (
      fileTableConfig.referencedTables &&
      Object.keys(fileTableConfig).length === 1
    ) {
      if (!existingFileTableConfig) throw "Must enable file storage first";
      newTableConfig = { ...existingFileTableConfig, ...fileTableConfig };
    } else {
      const { storageType } = fileTableConfig;

      if (storageType.type === "S3") {
        if (
          !(await dbs.credentials.findOne({
            id: storageType.credential_id,
          }))
        ) {
          throw "Invalid credential_id provided";
        }
      }
      const KEYS = ["fileTable", "storageType"] as const;
      if (
        existingFileTableConfig &&
        JSON.stringify(pickKeys(existingFileTableConfig, KEYS.slice(0))) !==
          JSON.stringify(pickKeys(fileTableConfig, KEYS.slice(0)))
      ) {
        throw "Cannot update " + KEYS.join("or");
      }

      newTableConfig = fileTableConfig;
    }

    /** Disable current file storage */
  } else {
    const fileTable = existingFileTableConfig?.fileTable;
    if (!fileTable) throw "Unexpected: fileTable already disabled";
    await db.tx(async (dbTX, t) => {
      const fileTableHandler = dbTX[fileTable];
      if (!fileTableHandler) {
        throw "Unexpected: fileTable table handler missing";
      }
      if (
        existingFileTableConfig.fileTable &&
        (existingFileTableConfig.storageType.type === "local" ||
          !opts?.keepS3Data)
      ) {
        if (!fileTable || !fileTableHandler.delete) {
          throw "Unexpected error. fileTable handler not found";
        }

        await fileTableHandler.delete({});
      }
      if (!opts?.keepFileTable) {
        const { citationsTable } = existingFileTableConfig;
        if (citationsTable) {
          await connectionManager
            .getActiveConnectionSilentFail(connId)
            ?.prgl.update({ tableConfig: undefined });
        }
        await t.any(
          (existingFileTableConfig.citationsTable ?
            "DROP TABLE ${citationsTable:name} CASCADE;"
          : "") + "DROP TABLE ${fileTable:name} CASCADE",
          {
            fileTable,
            citationsTable: existingFileTableConfig.citationsTable,
          },
        );
      }
    });
    newTableConfig = null;
  }
  const con = await dbs.connections.findOne({ id: connId });
  if (!con) throw "Connection not found";
  await dbs
    .tx(async (t) => {
      await connectionManager.setFileTable(con, newTableConfig);
      await t.database_configs.update(
        { id: dbConf.id },
        { file_table_config: newTableConfig },
      );
    })
    .catch((err) => {
      return Promise.reject(err);
    });
};
