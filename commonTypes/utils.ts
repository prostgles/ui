import { isDefined } from "./filterUtils";
import { DBSSchema } from "./publishUtils";

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const MONTH = DAY * 30;
export const YEAR = DAY * 365;

export type AGE = {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
};

export const QUERY_WATCH_IGNORE =
  "prostgles internal query that should be excluded from schema watch ";

export const getAgeFromDiff = (millisecondDiff: number) => {
  const roundFunc = millisecondDiff > 0 ? Math.floor : Math.ceil;

  const years = roundFunc(millisecondDiff / YEAR);
  const months = roundFunc((millisecondDiff % YEAR) / MONTH);
  const days = roundFunc((millisecondDiff % MONTH) / DAY);
  const hours = roundFunc((millisecondDiff % DAY) / HOUR);
  const minutes = roundFunc((millisecondDiff % HOUR) / MINUTE);
  const seconds = roundFunc((millisecondDiff % MINUTE) / SECOND);
  const milliseconds = millisecondDiff % SECOND;

  return { years, months, days, hours, minutes, seconds, milliseconds };
};
export const getAge = <ReturnALL extends boolean = false>(
  date1: number,
  date2: number,
  returnAll?: ReturnALL,
): ReturnALL extends true ? Required<AGE> : AGE => {
  const diff = +date2 - +date1;
  const roundFunc = diff > 0 ? Math.floor : Math.ceil;
  const years = roundFunc(diff / YEAR);
  const months = roundFunc(diff / MONTH);
  const days = roundFunc(diff / DAY);
  const hours = roundFunc(diff / HOUR);
  const minutes = roundFunc(diff / MINUTE);
  const seconds = roundFunc(diff / SECOND);

  if (returnAll && returnAll === true) {
    return getAgeFromDiff(diff);
  }

  if (years >= 1) {
    return { years, months } as any;
  } else if (months >= 1) {
    return { months, days } as any;
  } else if (days >= 1) {
    return { days, hours } as any;
  } else if (hours >= 1) {
    return { hours, minutes } as any;
  } else {
    return { minutes, seconds } as any;
  }
};

export const DESTINATIONS = [
  { key: "Local", subLabel: "Saved locally (server in address bar)" },
  { key: "Cloud", subLabel: "Saved to Amazon S3" },
] as const;

export type DumpOpts = DBSSchema["backups"]["options"];

export type PGDumpParams = {
  options: DumpOpts;
  credentialID?: DBSSchema["backups"]["credential_id"];
  destination: (typeof DESTINATIONS)[number]["key"];
  initiator?: string;
};

export type DeepWriteable<T> = {
  -readonly [P in keyof T]: DeepWriteable<T[P]>;
};
type AnyObject = Record<string, any>;

export type WithUndef<T extends AnyObject | undefined> =
  T extends AnyObject ?
    {
      [K in keyof T]: T[K] | undefined;
    }
  : T;

export type GetElementType<T extends any[] | readonly any[]> =
  T extends (infer U)[] ? U : never;

export type OmitDistributive<T, K extends keyof any> =
  T extends any ? Omit<T, K> : never;

export type PG_STAT_ACTIVITY = {
  datid: number | null;
  datname: string | null;
  pid: number;
  usesysid: number | null;
  usename: string | null;
  application_name: string;
  client_addr: string | null;
  client_hostname: string | null;
  client_port: number | null;
  backend_start: string;
  xact_start: string | null;
  query_start: string | null;
  state_change: string | null;
  wait_event_type: string | null;
  wait_event: string | null;
  state: string | null;
  backend_xid: any | null;
  backend_xmin: any | null;
  query: string;
  backend_type: string;
  blocked_by: number[];
  running_time: AnyObject;
};

export type PG_STAT_DATABASE = {
  datid: number;
  datname: string;
  numbackends: number;
  xact_commit: number;
  xact_rollback: number;
  blks_read: number;
  blks_hit: number;
  tup_returned: number;
  tup_fetched: number;
  tup_inserted: number;
  tup_updated: number;
  tup_deleted: number;
  conflicts: number;
  temp_files: number;
  temp_bytes: number;
  deadlocks: number;
  checksum_failures: number | null;
  checksum_last_failure: string | null;
  blk_read_time: number;
  blk_write_time: number;
  stats_reset: string;
};

export type IOStats = {
  majorNumber: number;
  minorNumber: number;
  deviceName: string;
  readsCompletedSuccessfully: number;
  readsMerged: number;
  sectorsRead: number;
  timeSpentReadingMs: number;
  writesCompleted: number;
  writesMerged: number;
  sectorsWritten: number;
  timeSpentWritingMs: number;
  IOsCurrentlyInProgress: number;
  timeSpentDoingIOms: number;
  weightedTimeSpentDoingIOms: number;
};

export type ServerStatus = {
  clock_ticks: number;
  total_memoryKb: number;
  free_memoryKb: number;
  uptimeSeconds: number;
  cpu_model: string;
  cpu_cores_mhz: string;
  cpu_mhz: string;
  disk_space: string;
  memAvailable: number;
  ioInfo?: IOStats[];
};

export type ConnectionStatus = {
  queries: PG_STAT_ACTIVITY[];
  topQueries: AnyObject[];
  blockedQueries: AnyObject[];
  connections: PG_STAT_DATABASE[];
  maxConnections: number;
  noBash: boolean;
  getPidStatsErrors: Partial<Record<string, any>>;
  serverStatus?: ServerStatus;
};

export type SampleSchema = {
  name: string;
  path: string;
} & (
  | {
      type: "sql";
      file: string;
    }
  | {
      type: "dir";
      tableConfigTs: string;
      onMountTs: string;
      onInitSQL: string;
      workspaceConfig: { workspaces: DBSSchema["workspaces"][] } | undefined;
    }
);

export type ProcStats = {
  pid: number;
  cpu: number;
  mem: number;
  uptime: number;
};

export function matchObj(
  obj1: AnyObject | undefined,
  obj2: AnyObject | undefined,
): boolean {
  if (obj1 && obj2) {
    return !Object.keys(obj1).some((k) => obj1[k] !== obj2[k]);
  }
  return false;
}

export function sliceText(
  v: string | undefined,
  maxLen: number,
  ellipseText = "...",
  midEllipse = false,
) {
  if (isDefined(v) && v.length > maxLen) {
    if (!midEllipse) return `${v.slice(0, maxLen)}${ellipseText}`;
    return `${v.slice(0, maxLen / 2)}${ellipseText}${v.slice(v.length - maxLen / 2 + 3)}`;
  }

  return v;
}

export type ColType = {
  column_name: string;
  escaped_column_name: string;
  data_type: string;
  udt_name: string;
  schema: string;
};
export const RELOAD_NOTIFICATION = "Prostgles UI accessible at";

export function throttle<Params extends any[]>(
  func: (...args: Params) => any,
  timeout: number,
): (...args: Params) => void {
  //@ts-ignore
  let timer: NodeJS.Timeout | undefined;
  let lastCallArgs: Params | undefined;
  const throttledFunc = (...args: Params) => {
    if (timer !== undefined) {
      lastCallArgs = args;
      return;
    } else {
      lastCallArgs = undefined;
    }
    //@ts-ignore
    timer = setTimeout(() => {
      func(...args);
      timer = undefined;
      if (lastCallArgs) {
        throttledFunc(...lastCallArgs);
      }
    }, timeout);
  };
  return throttledFunc;
}

export const SPOOF_TEST_VALUE = "trustme";

export const getEntries = <T extends AnyObject>(obj: T) =>
  Object.entries(obj) as [keyof T, T[keyof T]][];

export const CONNECTION_CONFIG_SECTIONS = [
  "access_control",
  "backups",
  "table_config",
  "details",
  "status",
  "methods",
  "file_storage",
  "API",
] as const;

/**
 * Ensure that multi-line strings are indented correctly
 */
export const fixIndent = (_str: string | TemplateStringsArray): string => {
  const str = typeof _str === "string" ? _str : (_str[0] ?? "");
  const lines = str.split("\n");
  if (!lines.some((l) => l.trim())) return str;
  let minIdentOffset = lines.reduce(
    (a, line) => {
      if (!line.trim()) return a;
      const indent = line.length - line.trimStart().length;
      return Math.min(a ?? indent, indent);
    },
    undefined as number | undefined,
  );
  minIdentOffset = Math.max(minIdentOffset ?? 0, 0);

  return lines
    .map((l, i) => (i === 0 ? l : l.slice(minIdentOffset)))
    .join("\n")
    .trim();
};

export const getConnectionPaths = ({
  id,
  url_path,
}: {
  id: string;
  url_path: string | null;
}) => {
  return {
    rest: `${API_PATH_SUFFIXES.REST}/${url_path || id}`,
    ws: `${API_PATH_SUFFIXES.WS}/${url_path || id}`,
    dashboard: `${API_PATH_SUFFIXES.DASHBOARD}/${id}`,
    config: `${API_PATH_SUFFIXES.CONFIG}/${id}`,
  };
};

export const API_PATH_SUFFIXES = {
  REST: "/rest-api",
  WS: "/ws-api-db",
  DASHBOARD: "/connections",
  CONFIG: "/connection-config",
} as const;

export const PROSTGLES_CLOUD_URL = "https://cloud1.prostgles.com";
