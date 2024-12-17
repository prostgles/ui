import type { DB } from "prostgles-server/dist/Prostgles";
import {
  QUERY_WATCH_IGNORE,
  type ServerStatus,
} from "../../../commonTypes/utils";
import { getCDB } from "../ConnectionManager/ConnectionManager";

export const IGNORE_QUERY = "prostgles-status-monitor-query";

export const execPSQLBash = (
  db: DB,
  connId: string,
  command: string,
): Promise<string[]> => {
  const tblName = JSON.stringify(`prostgles_shell_${connId}`);

  return db
    .any(
      `
    /* ${QUERY_WATCH_IGNORE}  */
    /* ${IGNORE_QUERY} */
    --DROP TABLE IF EXISTS ${tblName};
    CREATE TEMP TABLE IF NOT EXISTS ${tblName} (
      shell text
    );
    DELETE FROM ${tblName};
    COPY ${tblName} FROM PROGRAM \${command};
    SELECT shell FROM ${tblName};
    `,
      { command },
    )
    .then((vals) => vals.map((v) => Object.values(v)[0])) as any;
};

export const getServerStatus = async (
  db: DB,
  connId: string,
): Promise<ServerStatus> => {
  const getBashQuery = async <Vars extends Record<string, string>>(
    vars: Vars,
  ): Promise<Vars> => {
    const varDelimiter = "__del!m!t3r__";
    const ObjeEntries = Object.entries(vars);
    const command =
      ObjeEntries.map(
        ([varName, varCommand]) => `${varName}=$(${varCommand})`,
      ).join("\n") +
      `\nprintf "${ObjeEntries.map(([varName]) => `${varName}: \${${varName}}`).join(varDelimiter)}"`;
    const resArr = (await execPSQLBash(db, connId, command))[0]?.split(
      varDelimiter,
    );
    return Object.fromEntries(
      ObjeEntries.map(([key], index) => [
        key,
        resArr?.[index]?.slice(key.length + 2),
      ]),
    ) as any;
  };
  const { data_directory } = await db.oneOrNone("show data_directory;");

  const cpu_cores_mhz_arr = await execPSQLBash(
    db,
    connId,
    `cat /proc/cpuinfo | grep "MHz" | sed 's/^.*: //'`,
  );
  const cpu_cores_mhz = cpu_cores_mhz_arr.join("\n");
  let cpu_mhz = "";
  try {
    cpu_mhz = (await execPSQLBash(db, connId, `lscpu | grep "MHz"`)).join("\n");
  } catch (e) {
    /** Set from mhz array */
    const mhzNumArr = cpu_cores_mhz_arr.map((v) => +v).filter((v) => v);
    if (mhzNumArr.length && mhzNumArr.every((v) => Number.isFinite)) {
      cpu_mhz = [
        "CPU min MHz: " + Math.max(...mhzNumArr),
        "CPU max MHz: " + Math.max(...mhzNumArr),
      ].join("\n");
    }
  }
  const disk_spaceStr = (
    await execPSQLBash(db, connId, `df -h ${data_directory} | grep "/"`)
  ).join("\n");
  const {
    clock_ticks: clock_ticksStr,
    total_memory: total_memoryStr,
    uptime_array: uptimeStr,
    free_memory: free_memoryStr,
    cpu_model: cpu_modelStr,
    MemAvailableStr,
  } = await getBashQuery({
    clock_ticks: `getconf CLK_TCK`,
    total_memory: ` grep 'MemTotal' /proc/meminfo | grep -o -E "[0-9]+"`,
    free_memory: ` grep 'MemFree' /proc/meminfo | grep -o -E "[0-9]+"`,
    MemAvailableStr: ` grep 'MemAvailable' /proc/meminfo | grep -o -E "[0-9]+"`,
    uptime_array: ` cat /proc/uptime`,
    cpu_model: `lscpu | grep "Model name"`,
  });
  const [dsFilesystem, dsSize, dsUsed, dsAvail, dsUsePerc, dsMountedOn] =
    disk_spaceStr
      .trim()
      .split(" ")
      .map((v) => v.trim())
      .filter((v) => v);
  const disk_space = [
    `Filesystem: ${dsFilesystem}`,
    `Size: ${dsSize}`,
    `Used: ${dsUsed}`,
    `Avail: ${dsAvail}`,
    `Used: ${dsUsePerc}`,
    `MountedOn: ${dsMountedOn}`,
  ].join("\n");

  const clock_ticks = +clock_ticksStr;
  const total_memoryKb = +total_memoryStr;
  const free_memoryKb = +free_memoryStr;
  const [uptimeTotalSecondsStr, idleSeconds] = uptimeStr.split(" ");
  const uptimeSeconds = +(uptimeTotalSecondsStr ?? "0");
  const memAvailable = +MemAvailableStr;

  return {
    clock_ticks,
    total_memoryKb,
    free_memoryKb,
    uptimeSeconds,
    cpu_model: cpu_modelStr.split("Model name:")[1]?.trim() || cpu_modelStr,
    cpu_mhz,
    disk_space,
    cpu_cores_mhz,
    memAvailable,
  };
};

export const killPID = async (
  connId: string,
  id_query_hash: string,
  type: "cancel" | "terminate" = "cancel",
) => {
  if (!id_query_hash) throw "id_query_hash missing";

  const { db } = await getCDB(connId);
  return db.any(
    `
    /* ${IGNORE_QUERY} */
    SELECT pid, query, pg_${type}_backend(pid) 
    FROM pg_catalog.pg_stat_activity
    WHERE md5(pid || query) = \${id_query_hash} `,
    { id_query_hash },
  );
};
