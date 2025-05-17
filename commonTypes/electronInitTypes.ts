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
  electronCreds?: {
    db_conn: string;
    db_host: string;
    db_port: number;
    db_user: string;
    db_name: string;
    db_pass: string;
    db_ssl: string;
  };
  initState: ProstglesInitState<T>;
};

type OS = "Windows" | "Linux" | "Mac" | "";
export type InstalledPrograms = {
  os: OS;
  filePath: string;
  psql: string;
  pg_dump: string;
  pg_restore: string;
};

export const DEFAULT_ELECTRON_CONNECTION = {
  type: "Standard",
  db_host: "localhost",
  db_port: 5432,
  db_user: "prostgles_desktop",
  db_name: "prostgles_desktop_db",
} as const;
