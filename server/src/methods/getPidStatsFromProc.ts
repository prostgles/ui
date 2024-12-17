import type { DB } from "prostgles-server/dist/Prostgles";
import { execPSQLBash, getServerStatus } from "./statusMonitorUtils";
import { getCpuCoresMhz, type ServerLoadStats } from "./getPidStats";

export const getPidStatsFromProc = async (
  db: DB,
  connId: string,
): Promise<ServerLoadStats> => {
  const serverStatus = await getServerStatus(db, connId);
  const { clock_ticks, total_memoryKb, uptimeSeconds } = serverStatus;

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
  const pidInfo = await execPSQLBash(db, connId, pidCommand);
  const freqs = await getCpuCoresMhz(db, connId);
  const pidStats = pidInfo.map((line: string) => {
    const vm_rss_kb = Number(line.split("__")[1] || "nan");

    const name = line.split(" ")[1];

    /**
     * https://man7.org/linux/man-pages/man5/proc.5.html
     */
    const numericParts = line.split(" ").map((v) => Number(v || "nan"));

    const pid = numericParts[0];

    //           --#14 utime - CPU time spent in user code, measured in clock ticks
    const utime = numericParts[13];

    //           --#15 stime - CPU time spent in kernel code, measured in clock ticks
    const stime = numericParts[14];

    //           --#16 cutime - Waited-for children's CPU time spent in user code (in clock ticks)
    const cutime = numericParts[15];

    //           --#17 cstime - Waited-for children's CPU time spent in kernel code (in clock ticks)
    const cstime = numericParts[16];

    //           --#22 starttime - Time when the process started, measured in clock ticks
    const starttime = numericParts[21];
    const procId = numericParts[38];

    const total_time = utime! + stime! + cutime! + cstime!; // total time spent for the process and it's children
    const seconds = uptimeSeconds - starttime! / clock_ticks; // total elapsed time in seconds since the process started:

    const cpu_usage = 100 * (total_time / clock_ticks / seconds);

    const mem_usage =
      Number.isFinite(vm_rss_kb) ?
        (100 * vm_rss_kb) / total_memoryKb
      : undefined;

    const mhz = freqs[procId ?? -1] ?? "";
    return {
      pid,
      name,
      utime,
      stime,
      cutime,
      cstime,
      starttime,
      vm_rss_kb,
      mhz,
      total_time,
      seconds,
      cpu_usage,
      mem_usage,
    };
  });

  return {
    pidStats: pidStats.map((s) => ({
      pid: s.pid!,
      cmd: s.name!,
      cpu: s.cpu_usage!,
      mem: s.mem_usage!,
      mhz: s.mhz.toString(),
    })),
    serverStatus,
  };

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
};
