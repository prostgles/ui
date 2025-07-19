import type { SQLHandler } from "prostgles-types";

export const SSL_MODES = [
  { key: "disable", subLabel: "only try a non-SSL connection" },
  {
    key: "allow",
    subLabel:
      "first try a non-SSL connection; if that fails, try an SSL connection",
  },
  {
    key: "prefer",
    subLabel:
      "(Default) first try an SSL connection; if that fails, try a non-SSL connection",
  },
  {
    key: "require",
    subLabel:
      "only try an SSL connection. If a root CA file is present, verify the certificate in the same way as if verify-ca was specified",
  },
  {
    key: "verify-ca",
    subLabel:
      "only try an SSL connection, and verify that the server certificate is issued by a trusted certificate authority (CA)",
  },
  {
    key: "verify-full",
    subLabel:
      "only try an SSL connection, verify that the server certificate is issued by a trusted CA and that the requested server host name matches that in the certificate",
  },
] as const;

export const getDBCloneQuery = (
  oldDb: string,
  newDb: string,
  sql: SQLHandler,
): Promise<string> => {
  return sql(
    "/* originaldb must be idle/not accessed by other users */ \n \
  CREATE DATABASE ${newDb} WITH TEMPLATE ${oldDb} OWNER current_user; \n \
  \n \
  /* To make originaldb idle */ \n  \
  SELECT pg_terminate_backend(pg_stat_activity.pid)   \n  \
  FROM pg_stat_activity  \n  \
  WHERE pg_stat_activity.datname = ${newDb}   \n  \
  AND pid <> pg_backend_pid(); \n  \
  ",
    { oldDb, newDb },
    { returnType: "statement" },
  );
};
