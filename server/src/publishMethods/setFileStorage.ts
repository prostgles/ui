import type { ConnectionTableConfig } from "@src/ConnectionManager/ConnectionManager";
import { assertJSONBObjectAgainstSchema, pickKeys } from "prostgles-types";
import { connMgr, type DBS } from "..";
import { getConnectionAndDatabaseConfig } from "./getConnectionAndDatabaseConfig";

export const setFileStorage = async (
  dbs: DBS,
  connId: string,
  tableConfig?: ConnectionTableConfig,
  opts?: { keepS3Data?: boolean; keepFileTable?: boolean },
) => {
  const { db, dbConf } = await getConnectionAndDatabaseConfig(dbs, connId);

  let newTableConfig: ConnectionTableConfig | null =
    tableConfig ?
      {
        ...tableConfig,
      }
    : null;

  /** Enable file storage */
  if (tableConfig) {
    if (typeof tableConfig.referencedTables !== "undefined") {
      assertJSONBObjectAgainstSchema(
        { referencedTables: { record: { values: "any", partial: true } } },
        tableConfig,
        "referencedTables",
        false,
      );
    }
    if (tableConfig.referencedTables && Object.keys(tableConfig).length === 1) {
      if (!dbConf.file_table_config) throw "Must enable file storage first";
      newTableConfig = { ...dbConf.file_table_config, ...tableConfig };
    } else {
      assertJSONBObjectAgainstSchema(
        {
          fileTable: "string",
          storageType: {
            oneOfType: [
              {
                type: { enum: ["S3"] },
                credential_id: "number",
              },
              {
                type: { enum: ["local"] },
              },
            ],
          },
        },
        tableConfig as any,
        "tableConfig",
        false,
      );
      const { storageType } = tableConfig;

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
        dbConf.file_table_config &&
        JSON.stringify(pickKeys(dbConf.file_table_config, KEYS.slice(0))) !==
          JSON.stringify(pickKeys(tableConfig, KEYS.slice(0)))
      ) {
        throw "Cannot update " + KEYS.join("or");
      }

      newTableConfig = tableConfig;
    }

    /** Disable current file storage */
  } else {
    const fileTable = dbConf.file_table_config?.fileTable;
    if (!fileTable) throw "Unexpected: fileTable already disabled";
    await db.tx(async (dbTX) => {
      const fileTableHandler = dbTX[fileTable];
      if (!fileTableHandler)
        throw "Unexpected: fileTable table handler missing";
      if (
        dbConf.file_table_config?.fileTable &&
        (dbConf.file_table_config.storageType.type === "local" ||
          !opts?.keepS3Data)
      ) {
        if (!fileTable || !fileTableHandler.delete) {
          throw "Unexpected error. fileTable handler not found";
        }

        await fileTableHandler.delete({});
      }
      if (!opts?.keepFileTable) {
        await dbTX.sql!("DROP TABLE ${fileTable:name} CASCADE", {
          fileTable,
        });
      }
    });
    newTableConfig = null;
  }
  const con = await dbs.connections.findOne({ id: connId });
  if (!con) throw "Connection not found";
  await dbs
    .tx(async (t) => {
      await connMgr.setFileTable(con, newTableConfig);
      await t.database_configs.update(
        { id: dbConf.id },
        { file_table_config: newTableConfig },
      );
    })
    .catch((err) => {
      console.log({ err });
      return Promise.reject(err);
    });
};
