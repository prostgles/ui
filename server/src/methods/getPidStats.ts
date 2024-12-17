import type { DB } from "prostgles-server/dist/Prostgles";
import { isDefined } from "prostgles-types";
import type {
  ConnectionStatus,
  IOStats,
  PG_STAT_ACTIVITY,
  ServerStatus,
} from "../../../commonTypes/utils";
import { getPidStatsFromProc } from "./getPidStatsFromProc";
import {
  IGNORE_QUERY,
  execPSQLBash,
  getServerStatus,
} from "./statusMonitorUtils";
import { bytesToSize } from "../BackupManager/utils";
import type { DBS } from "..";
import {
  getCDB,
  getSuperUserCDB,
} from "../ConnectionManager/ConnectionManager";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";

type PS_ProcInfo = {
  pid: number;
  cpu: number;
  mem: number;
  mhz: string;
  cmd: string;
};

export type ServerLoadStats = {
  pidStats: PS_ProcInfo[];
  serverStatus: ServerStatus;
  getPidStatsErrors?: any;
};

const parsePidStats = (
  procInfo: Record<keyof PS_ProcInfo, any>,
): PS_ProcInfo | undefined => {
  const pid = +procInfo.pid;
  const cpu = +procInfo.cpu;
  const mem = +procInfo.mem;
  const cmd = procInfo.cmd;

  if ([pid, cpu, mem].some((v) => !Number.isFinite(v)) || !cmd) {
    return undefined;
  }

  const result = {
    pid: +pid,
    cpu: +cpu,
    mem: +mem,
    mhz: procInfo.mhz || "",
    cmd,
  };

  return result;
};

const ioStatMethods = {
  /**
   * https://www.kernel.org/doc/Documentation/ABI/testing/procfs-diskstats
   */
  diskstats: async (db: DB, connId: string): Promise<IOStats[]> => {
    const ioRows = await execPSQLBash(db, connId, `cat /proc/diskstats`);
    const ioInfo = ioRows.map((row) => {
      const rowParts = row.trim().replace(/  +/g, " ").split(" ");

      return Object.fromEntries(
        Object.entries({
          majorNumber: "number",
          minorNumber: "number",
          deviceName: "string",
          readsCompletedSuccessfully: "number",
          readsMerged: "number",
          sectorsRead: "number",
          timeSpentReadingMs: "number",
          writesCompleted: "number",
          writesMerged: "number",
          sectorsWritten: "number",
          timeSpentWritingMs: "number",
          IOsCurrentlyInProgress: "number",
          timeSpentDoingIOms: "number",
          weightedTimeSpentDoingIOms: "number",
        } as const).map(([key, type], idx) => [
          key,
          type === "number" ? Number(rowParts[idx]) : rowParts[idx]!,
        ]),
      ) as IOStats;
    });

    const deviceRows = ioInfo.filter(
      (r) => r.minorNumber === 0 && !r.deviceName?.startsWith("loop"),
    );
    return deviceRows;
  },
};

const pidStatsMethods = {
  top: async (db: DB, connId: string) => {
    const pidRows = await execPSQLBash(db, connId, `top -b -n1 | sed 1,7d`);
    const pidStatsWithMhz =
      connectionBashStatus[connId]?.available?.includes("ps") ?
        await pidStatsMethods.ps(db, connId)
      : undefined;
    const pidStats: PS_ProcInfo[] = pidRows
      .map((shell) => {
        const [pid, usr, pr, ni, virt, res, shr, s, cpu, mem, time, cmd = ""] =
          shell.trim().replace(/  +/g, " ").split(" ");
        const mhz =
          pidStatsWithMhz?.pidStats.find((p) => p.pid! == (pid as any))?.mhz ||
          "";
        return parsePidStats({ pid, cpu, mem, cmd, mhz });
      })
      .filter(isDefined);
    const serverStatus = await getServerStatus(db, connId);
    return { pidStats, serverStatus };
  },
  ps: async (db: DB, connId: string) => {
    const psRes = await execPSQLBash(db, connId, `ps -o pid,%cpu,%mem,psr,cmd`);
    const freqs = await getCpuCoresMhz(db, connId);
    const pidStats: PS_ProcInfo[] = psRes
      .slice(1)
      .map((line) => {
        const [pid, cpu, mem, psr, ...cmd] = line
          .trim()
          .replace(/  +/g, " ")
          .split(" ");
        return parsePidStats({
          pid,
          cpu,
          mem,
          mhz: freqs[+psr!],
          cmd: cmd.join(" "),
        });
      })
      .filter(isDefined);

    const serverStatus = await getServerStatus(db, connId);
    return { pidStats, serverStatus };
  },
  proc: (db: DB, connId: string) => {
    return getPidStatsFromProc(db, connId);
  },
} as const satisfies Record<
  string,
  (db: DB, connId: string) => Promise<ServerLoadStats>
>;

type PidStatProgs = keyof typeof pidStatsMethods;
type PidStatMode = PidStatProgs | "off";
type ConnectionStatInfo = {
  mode: PidStatMode;
  available?: PidStatProgs[];
  ioMode: "diskstats" | "off";
  getPidStatsErrors: Partial<Record<PidStatProgs, any>>;
};
const connectionBashStatus: Record<string, ConnectionStatInfo | undefined> = {};

export const getCpuCoresMhz = async (
  db: DB,
  connId: string,
): Promise<number[]> => {
  const coreFrequencies = await execPSQLBash(
    db,
    connId,
    `cat /proc/cpuinfo | grep "MHz" | sed 's/^.*: //'`,
  );
  return coreFrequencies.map((mhzStr) => {
    const mhz = Number(mhzStr);
    return Number.isFinite(mhz) ? Math.round(mhz) : -1;
  });
};

const getPidStatsMode = async (
  db: DB,
  connId: string,
): Promise<ConnectionStatInfo> => {
  const [platform] = await execPSQLBash(db, connId, "uname");
  const getPidStatsErrors: Partial<Record<PidStatProgs, any>> = {};
  if (platform !== "Linux") {
    getPidStatsErrors["proc"] = "uname not Linux";
    return { mode: "off", ioMode: "off", getPidStatsErrors };
  }

  let mode: PidStatMode | undefined;
  const available: PidStatProgs[] = [];
  for await (const [program, method] of Object.entries(pidStatsMethods) as [
    PidStatProgs,
    (typeof pidStatsMethods)[keyof typeof pidStatsMethods],
  ][]) {
    try {
      if (program === "proc") {
        await method(db, connId);
        mode ??= program;
        available.push(program);
      } else {
      /** TODO - ensure ps & proc output same values as top for cpu */
        const [which] = await execPSQLBash(db, connId, `which ${program}`);
        if (which) {
          await method(db, connId);
          mode ??= program;
          available.push(program);
        }
      }
    } catch (e) {
      getPidStatsErrors[program] = getErrorAsObject(e);
    }
  }

  let ioMode: "off" | "diskstats" = "off";
  try {
    await ioStatMethods.diskstats(db, connId);
    ioMode = "diskstats";
  } catch (e) {}

  return {
    mode: mode || "off",
    ioMode,
    available,
    getPidStatsErrors,
  };
};

export const getPidStats = async (
  db: DB,
  connId: string,
): Promise<ServerLoadStats | undefined> => {
  connectionBashStatus[connId] ??= await getPidStatsMode(db, connId).catch(
    (error) =>
      Promise.resolve({
        mode: "off",
        ioMode: "off",
        getPidStatsErrors: { proc: getErrorAsObject(error) },
      } as const),
  );
  const { mode } = connectionBashStatus[connId] ?? {};
  if (!mode || mode === "off") return undefined;
  return pidStatsMethods[mode](db, connId);
};

export const getStatus = async (connId: string, dbs: DBS) => {
  const { db: cdb } = await getSuperUserCDB(connId, dbs);
  const result: ConnectionStatus = {
    queries: (await cdb.any(
      `
      /* ${IGNORE_QUERY} */
      SELECT 
        datid, datname, pid, usesysid, usename, application_name, client_addr, 
        client_hostname, client_port, backend_start, xact_start, query_start, 
        state_change, wait_event_type, wait_event, state, 
        backend_xid, backend_xmin, query, backend_type, 
        pg_blocking_pids(pid) as blocked_by,
        COALESCE(cardinality(pg_blocking_pids(pid)), 0) blocked_by_num,
        md5(pid || query) as id_query_hash
      FROM pg_catalog.pg_stat_activity
      WHERE pid <> pg_backend_pid() -- query NOT ILIKE '%' || \${queryName} || '%'
    `,
      { queryName: IGNORE_QUERY },
    )) as PG_STAT_ACTIVITY[],
    blockedQueries: [],
    topQueries: [],
    getPidStatsErrors: connectionBashStatus[connId]?.getPidStatsErrors,
    noBash: connectionBashStatus[connId]?.mode === "off",
    connections: (await cdb.any(`
      /* ${IGNORE_QUERY} */
      SELECT *
      FROM pg_stat_database
      WHERE numbackends > 0;
    `)) as any,
    ...((await cdb.one(`
      SELECT setting::numeric as "maxConnections"
      FROM pg_catalog.pg_settings
      WHERE name = 'max_connections'
    `)) as any),
  };

  let procInfo: ServerLoadStats | undefined;
  try {
    procInfo = await getPidStats(cdb, connId);
    result.serverStatus = procInfo?.serverStatus;
    // result.getPidStatsErrors ??= procInfo?.getPidStatsErrors;
  } catch (err) {
    console.error(err);
  }

  if (procInfo && connectionBashStatus[connId]?.ioMode === "diskstats") {
    procInfo.serverStatus.ioInfo = await ioStatMethods.diskstats(cdb, connId);
  }

  await dbs.tx!(async (tx) => {
    await tx.stats.delete({ connection_id: connId });
    await tx.stats.insert(
      result.queries.map((q) => ({
        ...q,
        connection_id: connId,
      })),
      { onConflict: "DoNothing" },
    );

    if (!procInfo) return;

    await tx.stats.updateBatch(
      procInfo.pidStats.map(({ pid, ...otherFields }) => {
        return [
          { pid, connection_id: connId },
          {
            ...otherFields,
            memPretty: bytesToSize(
              (+otherFields.mem / 100) *
                procInfo!.serverStatus.total_memoryKb *
                1024,
            ),
          },
        ];
      }),
    );
  });

  return result;
};
