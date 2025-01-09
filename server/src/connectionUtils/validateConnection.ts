import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
export type ConnectionInsert = DBGeneratedSchema["connections"]["columns"];
import { ConnectionString } from "connection-string";
import type { DBSConnectionInfo } from "../electronConfig";

type ConnectionDefaults = Pick<
  DBSConnectionInfo,
  "db_host" | "db_name" | "db_port" | "db_ssl" | "db_user"
>;
const getDefaults = (c: Partial<ConnectionDefaults>) =>
  ({
    db_host: c.db_host ?? "localhost",
    db_name: c.db_name ?? "postgres",
    db_user: c.db_user ?? "postgres",
    db_port: c.db_port ?? 5432,
    db_ssl: c.db_ssl ?? "prefer",
  }) satisfies Required<ConnectionDefaults>;

type ValidatedConnectionDetails = Required<ConnectionDefaults> & {
  db_conn: string;
  db_pass?: string;
};

export type ConnectionInfo = Partial<
  DBSConnectionInfo & Connections & ConnectionInsert
>;

export const validateConnection = <C extends ConnectionInfo>(
  rawConnection: C,
): C & ValidatedConnectionDetails => {
  const result = { ...rawConnection } as C;

  if (rawConnection.type === "Connection URI") {
    const db_conn =
      rawConnection.db_conn ||
      validateConnection({
        ...result,
        ...getDefaults(result),
        type: "Standard",
      }).db_conn;

    const cs = new ConnectionString(db_conn);
    const params = cs.params ?? {};
    const { sslmode, host, port, dbname, user, password } = params;

    const { db_host, db_port, db_user, db_name, db_ssl } = getDefaults({
      db_host: cs.hosts?.[0]?.name || host,
      db_port: cs.hosts?.[0]?.port || +port,
      db_user: cs.user ?? (user || "postgres"),
      db_name: cs.path?.join("/") ?? dbname,
      db_ssl: sslmode,
    });

    const validated: ValidatedConnectionDetails = {
      ...rawConnection,
      db_conn,
      db_host,
      db_port,
      db_user,
      db_name,
      db_ssl,
      db_pass: cs.password ?? password,
    };

    return validated as any;
  } else if (rawConnection.type === "Standard" || rawConnection.db_host) {
    const { db_host, db_port, db_user, db_name, db_ssl, db_pass } = {
      ...getDefaults(rawConnection),
      ...rawConnection,
    };
    const cs = new ConnectionString(null, { protocol: "postgres" });
    cs.hosts = [
      {
        name: db_host,
        port: db_port,
      },
    ];
    cs.password = db_pass ?? undefined;
    cs.user = db_user;
    cs.path = [db_name];
    cs.params = { sslmode: rawConnection.db_ssl ?? "prefer" };
    const db_conn = cs.toString();

    const validated: ValidatedConnectionDetails = {
      ...rawConnection,
      db_host,
      db_port,
      db_user,
      db_name,
      db_ssl,
      db_conn,
      db_pass: rawConnection.db_pass ?? undefined,
    };

    return validated as any;
  } else {
    throw "Not supported";
  }
};
