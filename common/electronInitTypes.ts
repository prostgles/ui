import type { DBGeneratedSchema } from "./DBGeneratedSchema";

export type ProstglesInitState<
  T extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      error?: undefined;
      state: "loading";
    }
  | ({
      error?: undefined;
      state: "ok";
    } & T)
  | {
      error: Error | string | number | bigint | Record<string, any>;
      state: "error";
      errorType: "init" | "connection";
    };

export type ProstglesState<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  isElectron: boolean;
  xRealIpSpoofable?: boolean;
  electronCredsProvided?: boolean;
  electronCreds?: Required<
    Pick<
      DBGeneratedSchema["connections"]["columns"],
      | "db_conn"
      | "db_host"
      | "db_port"
      | "db_user"
      | "db_name"
      | "db_pass"
      | "db_ssl"
    >
  >;
  initState: ProstglesInitState<T>;
};

type OS = "Windows" | "Linux" | "Mac" | "";
export const programList = [
  /** Used for dump/restore */
  "psql",
  "pg_dump",
  "pg_restore",
  /** Used for docker-mcp */
  "docker",
] as const;
export type InstalledPrograms = {
  os: OS;
  filePath: string;
} & Record<(typeof programList)[number], string | undefined>;

export const DEFAULT_ELECTRON_CONNECTION = {
  type: "Standard",
  db_host: "localhost",
  db_port: 5432,
  db_user: "prostgles_desktop",
  db_name: "prostgles_desktop_db",
} as const;
