
import { connMgr, DBS } from "../index";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";

export type Users = Required<DBSchemaGenerated["users"]["columns"]>; 
export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;

import { DB } from "prostgles-server/dist/Prostgles";
import pg from "pg-promise/typescript/pg-subset";
import { ConnectionStatus, PG_STAT_ACTIVITY, QUERY_WATCH_IGNORE, ServerStatus } from "../../../commonTypes/utils";

const IGNORE_QUERY = "prostgles-status-monitor-query";

const connectionBashStatus: Record<string, "off" | "ps" | "proc"> = {};
type PS_ProcInfo = { pid: number; cpu: number; mem: number; cmd: string; };

export let cdbCache: Record<string, DB> = {};
export const getCDB = async (connId: string, opts?: pg.IConnectionParameters<pg.IClient>, isTemporary = false) => {
  if(!cdbCache[connId] || cdbCache[connId]?.$pool.ending || isTemporary){
    const db = await connMgr.getNewConnectionDb(connId, { application_name: "prostgles-status-monitor", ...opts });
    if(isTemporary) return db;
    cdbCache[connId] = db;
  }
  const result = cdbCache[connId];
  if(!result){
    throw `Something went wrong: sql handler missing`;
  }

  return result;
}


const getPidStats = async (db: DB, connId: string): Promise<FullStats | undefined> => {

  /**
   * $OSTYPE IS EMPTY
   */
  // const platformQuery = `
  // if [[ "$OSTYPE" == "linux-gnu"* || \`uname\` == "Linux" ]] then  echo "linux"; fi;
  // `;
  if(connectionBashStatus[connId] === "off") return undefined;

  const [platform] = await execPSQLBash(db, connId, "uname");
  if(platform !== "Linux"){
    connectionBashStatus[connId] = "off";
    return undefined;
    // throw "Only linux is supported";
  }

  if(!connectionBashStatus[connId] || connectionBashStatus[connId] === "ps"){
    try {
      const res = await getPidStatsFromPs(db, connId);
      connectionBashStatus[connId] = "ps";
      return res;
    } catch {
      
    }
  }


  try {
    /** In case ps is not installed or fails */
    const res = await getPidStatsFromProc(db, connId);
    connectionBashStatus[connId] === "proc";
    return res;
  } catch {
    connectionBashStatus[connId] === "off";
  }
   
  return undefined;
}

const execPSQLBash = (db: DB, connId: string, command: string, getSelect?: (tblName: string) => string): Promise<string[]> => {
  const tblName = JSON.stringify(`prostgles_shell_${connId}`);

  return db.any(`
    /* ${QUERY_WATCH_IGNORE}  */
    /* ${IGNORE_QUERY} */
    DROP TABLE IF EXISTS ${tblName};
    CREATE TEMP TABLE ${tblName} (
      shell text
    );
    COPY ${tblName} FROM PROGRAM \${command};
    ${getSelect?.(tblName) ?? `SELECT shell FROM ${tblName}`};
    `, 
    { command },
  ).then(vals => getSelect? vals : vals.map(v => Object.values(v)[0])) as any;
}


const getPidStatsFromPs = async (db: DB, connId: string): Promise<FullStats> => {
  const psRes = await execPSQLBash(db, connId, `ps -o pid,%cpu,%mem,cmd`);
  const pidStats: PS_ProcInfo[] = psRes.slice(1).map(line => {
    const [pid, cpu, mem, ...cmd] = line.trim().replace(/  +/g, ' ').split(" ");
    return {
      pid: +pid!,
      cpu: +cpu!,
      mem: +mem!,
      cmd: cmd.join(" "),
    }
  });
  return {
    pidStats,
    serverStatus: (await getServerStatus(db, connId)),
  };
}

export const getServerStatus = async (db: DB, connId: string): Promise<ServerStatus> => {
  
  const getBashQuery = async <Vars extends Record<string, string>>(vars: Vars): Promise<Vars> => {
    const varDelimiter = "__del!m!t3r__"
    const ObjeEntries = Object.entries(vars)
    const command = ObjeEntries.map(([varName, varCommand]) => `${varName}=$(${varCommand})`).join("\n") +
      `\nprintf "${ObjeEntries.map(([varName]) => `${varName}: \${${varName}}`).join(varDelimiter)}"`;
    const resArr = (await execPSQLBash(db, connId, command))[0]?.split(varDelimiter);
    return Object.fromEntries(ObjeEntries.map(([key], index) => [key, resArr?.[index]?.slice(key.length + 2)])) as any;
  }
  const { data_directory } = await db.oneOrNone("show data_directory;");

  const cpu_mhz = (await execPSQLBash(db, connId, `lscpu | grep "MHz"`)).join("\n");
  const cpu_cores_mhz = (await execPSQLBash(db, connId, `cat /proc/cpuinfo | grep "MHz" | sed 's/^.*: //'`)).join("\n");
  const disk_spaceStr = (await execPSQLBash(db, connId, `df -h ${data_directory} | grep "/"`)).join("\n");
  const {
    clock_ticks: clock_ticksStr,
    total_memory: total_memoryStr,
    uptime_array: uptimeStr,
    free_memory: free_memoryStr, 
    cpu_model: cpu_modelStr, 
  } = await getBashQuery({
    clock_ticks: `getconf CLK_TCK`,
    total_memory: ` grep 'MemTotal' /proc/meminfo | grep -o -E "[0-9]+"`,
    free_memory: ` grep 'MemFree' /proc/meminfo | grep -o -E "[0-9]+"`,
    uptime_array: ` cat /proc/uptime`,
    cpu_model: `lscpu | grep "Model name"`, 
  });
  const [dsFilesystem, dsSize, dsUsed, dsAvail, dsUsePerc, dsMountedOn] = disk_spaceStr.trim().split(" ").map(v => v.trim()).filter(v => v);
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
  const uptimeSeconds = +uptimeStr;

  return {
    clock_ticks,
    total_memoryKb,
    free_memoryKb,
    uptimeSeconds,
    cpu_model: cpu_modelStr.split("Model name:")[1]?.trim() || cpu_modelStr,
    cpu_mhz,
    disk_space,
    cpu_cores_mhz,
  }
}

type FullStats = { 
  pidStats: PS_ProcInfo[]; 
  serverStatus: ServerStatus;
}; 

const getPidStatsFromProc = async (db: DB, connId: string): Promise<FullStats> => {

  const serverStatus = await getServerStatus(db, connId);
  const {
    clock_ticks,
    total_memoryKb,
    uptimeSeconds
  } = serverStatus;
  const pidCommand = `
    pid_array=\`ls /proc | grep -E '^[0-9]+$'\`
    for pid in $pid_array
      do
        if [ -r /proc/$pid/stat ]
        then
          vm_rss=$( grep 'VmRSS' /proc/$pid/status  | grep -o -E "[0-9]+"  )
          stat_array=$( cat /proc/$pid/stat )
          result=" $stat_array __$vm_rss"
          echo $result
        fi
      done
  `;
  const pidStats: {
    cpu_usage: number,
    pid: number,
    name: string,
    total_time: number,
    seconds: number,
    mem_usage: number,
    vm_rss_kb: number,
  }[] = await execPSQLBash(db, connId, pidCommand, tbl => `
    SELECT 
      *,
      (100 * ((total_time / ${clock_ticks}) / seconds))::NUMERIC(5,2) as cpu_usage,
      (100 * vm_rss_kb/${total_memoryKb})::NUMERIC(5,2) as mem_usage
    FROM (
      SELECT 
      --shell, 
        pid, name,
        utime + stime + cutime + cstime as total_time, -- total time spent for the process and it's children
        ${uptimeSeconds} - (starttime / ${clock_ticks}) as seconds, -- total elapsed time in seconds since the process started:
        vm_rss_kb
      FROM (
      
        SELECT shell
          , split_part(shell, '__', 2)::INTEGER as vm_rss_kb
          , split_part(shell, ' ', 1)::INTEGER as pid
          , split_part(shell, ' ', 2) as name
      
          --#14 utime - CPU time spent in user code, measured in clock ticks
          , split_part(shell, ' ', 14)::NUMERIC as utime
          
          --#15 stime - CPU time spent in kernel code, measured in clock ticks
          , split_part(shell, ' ', 15)::NUMERIC as stime
      
          --#16 cutime - Waited-for children's CPU time spent in user code (in clock ticks)
          , split_part(shell, ' ', 16)::NUMERIC as cutime
      
          --#17 cstime - Waited-for children's CPU time spent in kernel code (in clock ticks)
          , split_part(shell, ' ', 17)::NUMERIC as cstime
      
          --#22 starttime - Time when the process started, measured in clock ticks
          , split_part(shell, ' ', 22)::NUMERIC as starttime
        FROM ${tbl}
      ) t
    ) tt
  `) as any;

  // console.log({
  //   clock_ticks, total_memory, uptime, uptimeStr, pidStats
  // });

  return {
    
    pidStats: pidStats.map(s => ({
      pid: s.pid,
      cmd: s.name,
      cpu: s.cpu_usage,
      mem: s.mem_usage,
    })),
    serverStatus,
  }

//         -- comm=( `grep -Po '^[^\s\/]+' /proc/$pid/comm` )
//         -- user_id=$( grep -Po '(?<=Uid:\s)(\d+)' /proc/$pid/status )

//         -- user=$( id -nu $user_id )
//         -- uptime=${uptime_array[0]}

//         -- state=${stat_array[2]}
//         -- ppid=${stat_array[3]} 
//         -- priority=${stat_array[17]}
//         -- nice=${stat_array[18]}

//         -- utime=${stat_array[13]}
//         -- stime=${stat_array[14]}
//         -- cutime=${stat_array[15]}
//         -- cstime=${stat_array[16]}
//         -- num_threads=${stat_array[19]}
//         -- starttime=${stat_array[21]}

//         -- total_time=$(( $utime + $stime ))
//         -- #add $cstime - CPU time spent in user and kernel code ( can olso add $cutime - CPU time spent in user code )
//         -- total_time=$(( $total_time + $cstime ))
//         -- seconds=$( awk 'BEGIN {print ( '$uptime' - ('$starttime' / '$clock_ticks') )}' )
//         -- cpu_usage=$( awk 'BEGIN {print ( 100 * (('$total_time' / '$clock_ticks') / '$seconds') )}' )

//         -- resident=${statm_array[1]}
//         -- data_and_stack=${statm_array[5]}
//         -- memory_usage=$( awk 'BEGIN {print( (('$resident' + '$data_and_stack' ) * 100) / '$total_memory'  )}' )

//         -- printf "%-6d %-6d %-10s %-4d %-5d %-4s %-4u %-7.2f %-7.2f %-18s\n" $pid $ppid $user $priority $nice $state $num_threads $memory_usage $cpu_usage $comm >> .data.ps

//   `
}


export const getStatus = async (connId: string, dbs: DBS) => {
  const cdb = await getCDB(connId); 
  let result: ConnectionStatus = {
    queries: (await cdb.any(`
      /* ${IGNORE_QUERY} */
      SELECT 
        --*,
        datid, datname, pid, usesysid, usename, application_name, client_addr, 
        client_hostname, client_port, backend_start, xact_start, query_start, 
        state_change, wait_event_type, wait_event, state, backend_xid, backend_xmin, query, backend_type, 

        pg_blocking_pids(pid) as blocked_by,
        --'{1,2,3}'::int[] as blocked_by,
        COALESCE(cardinality(pg_blocking_pids(pid)), 0) blocked_by_num,
        md5(pid || query) as id_query_hash
      FROM pg_catalog.pg_stat_activity
      WHERE query NOT ILIKE '%' || \${queryName} || '%'
    `, { queryName: IGNORE_QUERY })) as PG_STAT_ACTIVITY[],
    blockedQueries: [],
    topQueries: [],
    noBash: connectionBashStatus[connId] === "off",
    connections: (await cdb.any(`
      /* ${IGNORE_QUERY} */
      SELECT *
      FROM pg_stat_database
      WHERE numbackends > 0;
    `)) as any,
    ...(await cdb.one(`
      SELECT setting::numeric as "maxConnections"
      FROM pg_catalog.pg_settings
      WHERE name = 'max_connections'
    `)) as any
  };

  let procInfo: FullStats | undefined;
  try {
    procInfo = await getPidStats(cdb, connId);
    result.serverStatus = procInfo?.serverStatus;
  } catch(err) {
    console.error(err);
  }

  await dbs.tx!(async tx => {
    await tx.stats.delete({ connection_id: connId });
    await tx.stats.insert(result.queries.map(q => ({ 
      ...q, 
      connection_id: connId,
    })));
    // if(procInfo.length){
    //   await Promise.all(procInfo.map(p => tx.stats.update({ ...pickKeys(p, ["pid"]), connection_id: connId, }, omitKeys(p, ["pid"]))));
    // }
    
    /** This is slower?! */
    if(procInfo){

      await tx.stats.updateBatch(
        procInfo.pidStats.map(({ pid, ...otherFields }) => {
          return [{ pid, connection_id: connId, }, otherFields];
        }
      ));
    }
  });

  return result;
}

export const killPID = async (connId: string, id_query_hash: string, type: "cancel" | "terminate" = "cancel") => {
  if(!id_query_hash) throw "id_query_hash missing";

  const cdb = await getCDB(connId); 
  return cdb.any(`
    /* ${IGNORE_QUERY} */
    SELECT pid, query, pg_${type}_backend(pid) 
    FROM pg_catalog.pg_stat_activity
    WHERE md5(pid || query) = \${id_query_hash} `, 
    { id_query_hash }
  );
}