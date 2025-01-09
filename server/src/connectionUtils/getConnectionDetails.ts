import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
import { ConnectionString } from "connection-string";
import type pg from "pg-promise/typescript/pg-subset";

type ConnectionDetails = Required<
  Pick<
    pg.IConnectionParameters<pg.IClient>,
    | "application_name"
    | "host"
    | "port"
    | "password"
    | "user"
    | "ssl"
    | "database"
  >
> & { password: string; connectionTimeoutMillis?: number };

export const getConnectionDetails = (c: Connections): ConnectionDetails => {
  /**
   * Cannot use connection uri without having ssl issues
   * https://github.com/brianc/node-postgres/issues/2281
   */
  const getSSLOpts = (
    sslmode: Connections["db_ssl"],
  ): pg.IConnectionParameters<pg.IClient>["ssl"] =>
    sslmode !== "disable" ?
      {
        ca: c.ssl_certificate ?? undefined,
        cert: c.ssl_client_certificate ?? undefined,
        key: c.ssl_client_certificate_key ?? undefined,
        rejectUnauthorized:
          c.ssl_reject_unauthorized ??
          ((sslmode === "require" && !!c.ssl_certificate) ||
            sslmode === "verify-ca" ||
            sslmode === "verify-full"),
      }
    : undefined;

  const default_application_name = "";

  if (c.type === "Connection URI") {
    const cs = new ConnectionString(c.db_conn);
    const params = cs.params ?? {};
    const {
      sslmode,
      application_name = default_application_name,
      connect_timeout = 10,
    } = params;
    const conn = {
      application_name,
      host: cs.hosts![0]!.name!,
      port: cs.hosts![0]!.port!,
      user: cs.user!,
      password: cs.password!,
      database: cs.path![0]!,
      ssl: getSSLOpts(sslmode) ?? false,
      ...(Number.isFinite(connect_timeout) && {
        connectionTimeoutMillis: Math.ceil(connect_timeout) * 1000,
      }),
    };
    return conn;
  }
  const conn = {
    application_name: default_application_name,
    database: c.db_name!,
    user: c.db_user!,
    password: c.db_pass!,
    host: c.db_host!,
    port: c.db_port!,
    ssl: getSSLOpts(c.db_ssl) ?? false,
    ...(Number.isFinite(c.db_connection_timeout) && {
      connectionTimeoutMillis: Math.ceil(c.db_connection_timeout!),
    }),
  };
  return conn;
};
