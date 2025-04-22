export type ProstglesInitState = {
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
  electronIssue?: {
    type: "Older schema";
  };
  initError?: any;
  connectionError?: any;
  ok: boolean;
  canDumpAndRestore:
    | {
        psql: string;
        pg_dump: string;
        pg_restore: string;
      }
    | undefined;
};

export type ServerState = ProstglesInitState;

export const DEFAULT_ELECTRON_CONNECTION = {
  type: "Standard",
  db_host: "localhost",
  db_port: 5432,
  db_user: "prostgles_desktop",
  db_name: "prostgles_desktop_db",
} as const;
