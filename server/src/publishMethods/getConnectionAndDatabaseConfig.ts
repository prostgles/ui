import { getDatabaseConfigFilter } from "@src/ConnectionManager/connectionManagerUtils";
import { assertJSONBObjectAgainstSchema } from "prostgles-types";
import { connMgr, type DBS } from "..";

export const getConnectionAndDatabaseConfig = async (
  dbs: DBS,
  arg0: unknown,
) => {
  const arg = { connId: arg0 };
  assertJSONBObjectAgainstSchema(
    {
      connId: "string",
    },
    arg,
    "connId",
    false,
  );
  const { connId } = arg;
  const c = await dbs.connections.findOne({ id: connId });
  if (!c) throw "Connection not found";
  const dbConf = await dbs.database_configs.findOne(getDatabaseConfigFilter(c));
  if (!dbConf) throw "Connection database_config not found";
  const db = connMgr.getConnectionDb(connId);
  if (!db) throw "db missing";

  return { c, dbConf, db };
};
