
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
export type ConnectionInsert = DBSchemaGenerated["connections"]["columns"];
import { ConnectionString } from 'connection-string';
import { DBSConnectionInfo } from "../electronConfig";

type ConnectionDefaults = Pick<DBSConnectionInfo, "db_host" | "db_name" | "db_port" | "db_ssl" | "db_user">;
const getDefaults = (c: Partial<ConnectionDefaults>) => ({
  db_host: c.db_host ?? "localhost",
  db_name: c.db_name ?? c.db_user ?? "postgres",
  db_user: c.db_user ?? "postgres",
  db_port: c.db_port ?? 5432,
  db_ssl: c.db_ssl ?? "prefer",
} satisfies Required<ConnectionDefaults>)

export const validateConnection = <C extends DBSConnectionInfo | Connections | ConnectionInsert>(rawConnection: C | Record<string, any>): C => {
  let result = { ...rawConnection } as C;
  
  if(rawConnection.type === "Connection URI"){
    if(!rawConnection.db_conn){
      result.db_conn = validateConnection({ 
        ...result, 
        ...getDefaults(result),
        type: "Standard", 
      }).db_conn
    }
    const cs = new ConnectionString(result.db_conn);
    const params = cs.params ?? {};
    const { 
      sslmode,
      host,
      port,
      dbname,
      user,
      password,
    } = params;

    const {
      db_host, db_port, db_user, db_name, db_ssl
    } = getDefaults({
      db_host: cs.hosts?.[0]?.name || host,
      db_port: cs.hosts?.[0]?.port || +port,
      db_user: cs.user ?? (user || "postgres"),
      db_name: cs.path?.join("/") ?? dbname,
      db_ssl: sslmode
    });

    result.db_host = db_host;
    result.db_port = db_port;
    result.db_user = db_user;
    result.db_name = db_name;
    result.db_ssl = db_ssl; 
    result.db_pass = cs.password ?? password;

  } else if(rawConnection.type === "Standard" || rawConnection.db_host){
    const { db_host, db_port, db_user, db_name, db_ssl } = {
      ...rawConnection,
      ...getDefaults(rawConnection),
    }
    const cs = new ConnectionString(null, { protocol: "postgres" });
    cs.hosts = [{ 
      name: db_host, 
      port: db_port 
    }];
    cs.password = rawConnection.db_pass;
    cs.user = db_user;
    cs.path = [db_name];
    cs.params = db_ssl? { sslmode: rawConnection.db_ssl ?? "prefer" } : undefined;
    result.db_conn = cs.toString();

  } else {
    throw "Not supported"
  }

  const defaults = getDefaults(result);
  result.db_user = result.db_user || defaults.db_user;
  result.db_host = result.db_host || defaults.db_host;
  result.db_ssl = result.db_ssl || defaults.db_ssl;
  result.db_port = result.db_port ?? defaults.db_port;

  return result;
}