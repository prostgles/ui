
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
import { ConnectionString } from 'connection-string';

export const validateConnection = (c: DBSchemaGenerated["connections"]["columns"]): Connections => {
  let result: Connections = { ...c } as any;
  
  if(c.type === "Connection URI"){
    if(!c.db_conn){
      result.db_conn = validateConnection({ ...result, type: "Standard" }).db_conn
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

    // if(!cs.hosts?.length) throw `Host missing`
    // if(!cs.path?.length) throw `DB name missing`

    result.db_host = cs.hosts?.[0].name || (host || "localhost");
    result.db_port = cs.hosts?.[0].port || (+port ?? 5432);
    result.db_user = cs.user ?? (user || "postgres");
    result.db_pass = cs.password ?? password;
    result.db_name = cs.path?.join("/") ?? dbname;
    result.db_ssl = sslmode || "disable";
    // result.type = "Standard"
  } else if(c.type === "Standard" || c.db_host){
    const cs = new ConnectionString(null, { protocol: "postgres" });
    cs.hosts = [{ name: c.db_host!, port: c.db_port! }];
    cs.password = c.db_pass!;
    cs.user = c.db_user!;
    cs.path = [c.db_name!];
    cs.params = c.db_ssl? { sslmode: c.db_ssl ?? "prefer" } : undefined;
    result.db_conn = cs.toString()
  } else throw "Not supported"

  result.db_user = result.db_user || "postgres";
  result.db_host = result.db_host || "localhost";
  result.db_ssl = result.db_ssl || "disable";
  result.db_port = result.db_port ?? 5432;


  return result;
}