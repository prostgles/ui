import { execSync } from "child_process";

export const getInitiatedPostgresqlPIDs = (parentPid: number) => {
  const tcpConnections = execSync(`ss -tpn | grep ${parentPid}`)
    .toString()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [state, recvQ, sendQ, localAddress, peerAddress, procInfo] = line
        .trim()
        .split(/\s+/);
      return {
        state,
        recvQ,
        sendQ,
        localAddress,
        peerAddress,
        procInfo,
      };
    });
  console.log(`TCP connections for parent PID ${parentPid}:`, tcpConnections);
  // then just ` sudo lsof -i :localPort `
  // try {
  //   // Get network connections for the parent process
  //   const netContent = readFileSync(`/proc/${parentPid}/net/tcp`, "utf8");
  //   const connections = netContent.split("\n").slice(1).filter(Boolean);

  //   const remotePids: number[] = [];

  //   connections.forEach((line) => {
  //     const parts = line.trim().split(/\s+/);
  //     const localAddr = parts[1];
  //     const state = parts[3];
  //     const remoteAddr = parts[2];
  //     if (state === "01" && localAddr && remoteAddr) {
  //       // ESTABLISHED connection

  //       // Find which process has the remote address as local
  //       const allPids = readdirSync("/proc").filter((name) =>
  //         /^\d+$/.test(name),
  //       );

  //       for (const pid of allPids) {
  //         if (pid === parentPid.toString()) continue;

  //         try {
  //           const pidNetContent = readFileSync(`/proc/${pid}/net/tcp`, "utf8");
  //           if (
  //             pidNetContent.includes(remoteAddr.split(":").reverse().join(":"))
  //           ) {
  //             remotePids.push(parseInt(pid));
  //             console.log(`Parent pid: ${parentPid} connected to ${pid}`);
  //             break;
  //           }
  //         } catch (e) {
  //           // Process might have disappeared or no permission
  //         }
  //       }
  //     }
  //   });

  //   console.log(remotePids);
  //   return remotePids;
  // } catch (error) {
  //   console.error("Error reading /proc filesystem:", error);
  //   return [];
  // }
  // const procs = execSync(`netstat -tep | grep ${parentPid} | awk '{print $4}'`)
  //   .toString()
  //   .split("\n")
  //   .filter(Boolean);
  // procs.forEach((proc, index) => {
  //   const [host, port] = proc.split(":");
  //   if (port) {
  //     const pid = execSync(
  //       `sudo lsof -i:${port} | grep -v ${parentPid} | awk 'NR>1 {print $2}' | head -1`,
  //     )
  //       .toString()
  //       .trim();
  //     console.log(`Parent pid: ${parentPid} connected to ${pid}`);
  //   }
  // });
};
