import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
import { ConnectionString } from "connection-string";
import type { ISSLConfig } from "pg-promise/typescript/pg-subset";
import type pg from "pg-promise/typescript/pg-subset";

export type ConnectionDetails = {
  ssl: boolean | Omit<ISSLConfig, "checkServerIdentity">;
  application_name: string;
  host: string;
  port: number;
  user: string;
  database: string;
  password: string;
  connectionTimeoutMillis?: number;
};

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
    const connectionUri = c.db_conn ?? "";
    /**
     * Parse the query separately because `connection-string` treats unescaped
     * slashes in values as path separators. PostgreSQL commonly uses them in
     * Unix-socket URLs such as `?host=/var/run/postgresql`.
     */
    const queryStart = connectionUri.indexOf("?");
    const cs = new ConnectionString(
      queryStart === -1 ? connectionUri : connectionUri.slice(0, queryStart),
    );
    const params =
      queryStart === -1 ?
        {}
      : Object.fromEntries(
          new URLSearchParams(connectionUri.slice(queryStart + 1)).entries(),
        );
    const {
      sslmode,
      host,
      port,
      application_name = default_application_name,
      connect_timeout = 10,
    } = params;
    const parsedPort = Number(port);
    const parsedConnectTimeout = Number(connect_timeout);
    const conn = {
      application_name,
      host: cs.hosts?.[0]?.name ?? host ?? c.db_host,
      port:
        cs.hosts?.[0]?.port ??
        (Number.isFinite(parsedPort) && parsedPort > 0 ?
          parsedPort
        : c.db_port),
      user: cs.user!,
      password: cs.password!,
      database: cs.path![0]!,
      ssl: getSSLOpts(sslmode as Connections["db_ssl"]) ?? false,
      ...(Number.isFinite(parsedConnectTimeout) && {
        connectionTimeoutMillis: Math.ceil(parsedConnectTimeout) * 1000,
      }),
    };
    return conn;
  }
  const conn = {
    application_name: default_application_name,
    database: c.db_name,
    user: c.db_user,
    password: c.db_pass!,
    host: c.db_host,
    port: c.db_port,
    ssl: getSSLOpts(c.db_ssl) ?? false,
    ...(Number.isFinite(c.db_connection_timeout) && {
      connectionTimeoutMillis: Math.ceil(c.db_connection_timeout!),
    }),
  };
  return conn;
};
