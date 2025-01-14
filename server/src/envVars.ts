import * as dotenv from "dotenv";
import path from "path";
import type { DBSConnectionInfo } from "./electronConfig";
import { actualRootDir } from "./electronConfig";
import { DB_SSL_ENUM } from "./tableConfig/tableConfigConnections";
import { validateConnection } from "./connectionUtils/validateConnection";
const envFileVars = dotenv.config({
  path: path.resolve(actualRootDir + "/../.env"),
});

export const {
  PRGL_USERNAME = "",
  PRGL_PASSWORD = "",

  POSTGRES_URL,
  POSTGRES_DB,
  POSTGRES_HOST,
  POSTGRES_PASSWORD,
  POSTGRES_PORT,
  POSTGRES_USER,
  POSTGRES_SSL,
  PROSTGLES_STRICT_COOKIE,
} = {
  ...(envFileVars.parsed ?? {}),
  ...process.env,
} as Record<string, string>;

const db_ssl: DBSConnectionInfo["db_ssl"] =
  DB_SSL_ENUM[DB_SSL_ENUM.indexOf(POSTGRES_SSL?.trim().toLowerCase() as any)] ??
  "prefer";
export const DBS_CONNECTION_INFO = validateConnection({
  name: "Prostgles UI state",
  type: !POSTGRES_URL ? "Standard" : "Connection URI",
  db_conn: POSTGRES_URL ?? null,
  db_name: POSTGRES_DB,
  db_user: POSTGRES_USER,
  db_pass: POSTGRES_PASSWORD ?? null,
  db_host: POSTGRES_HOST,
  db_port: parseInt(POSTGRES_PORT ?? "5432"),
  db_ssl,
});
