"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatus = exports.getPidStats = exports.getCpuCoresMhz = void 0;
const prostgles_types_1 = require("prostgles-types");
const getPidStatsFromProc_1 = require("./getPidStatsFromProc");
const statusMonitorUtils_1 = require("./statusMonitorUtils");
const utils_1 = require("../BackupManager/utils");
const ConnectionManager_1 = require("../ConnectionManager/ConnectionManager");
const parsePidStats = (procInfo) => {
    const pid = +procInfo.pid;
    const cpu = +procInfo.cpu;
    const mem = +procInfo.mem;
    const cmd = procInfo.cmd;
    if ([pid, cpu, mem].some(v => !Number.isFinite(v)) || !cmd) {
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
const pidStatsMethods = {
    top: async (db, connId) => {
        const pidRows = await (0, statusMonitorUtils_1.execPSQLBash)(db, connId, `top -b -n1 | sed 1,7d`);
        const pidStatsWithMhz = connectionBashStatus[connId]?.available?.includes("ps") ? await pidStatsMethods.ps(db, connId) : undefined;
        const pidStats = pidRows.map(shell => {
            const [pid, usr, pr, ni, virt, res, shr, s, cpu, mem, time, cmd = ""] = shell.trim().replace(/  +/g, " ").split(" ");
            const mhz = pidStatsWithMhz?.pidStats.find(p => p.pid == pid)?.mhz || "";
            return parsePidStats({ pid, cpu, mem, cmd, mhz });
        }).filter(prostgles_types_1.isDefined);
        const serverStatus = await (0, statusMonitorUtils_1.getServerStatus)(db, connId);
        return { pidStats, serverStatus };
    },
    ps: async (db, connId) => {
        const psRes = await (0, statusMonitorUtils_1.execPSQLBash)(db, connId, `ps -o pid,%cpu,%mem,psr,cmd`);
        const freqs = await (0, exports.getCpuCoresMhz)(db, connId);
        const pidStats = psRes.slice(1).map(line => {
            const [pid, cpu, mem, psr, ...cmd] = line.trim().replace(/  +/g, " ").split(" ");
            return parsePidStats({ pid, cpu, mem, mhz: freqs[+psr], cmd: cmd.join(" ") });
        }).filter(prostgles_types_1.isDefined);
        const serverStatus = await (0, statusMonitorUtils_1.getServerStatus)(db, connId);
        return { pidStats, serverStatus };
    },
    proc: (db, connId) => {
        return (0, getPidStatsFromProc_1.getPidStatsFromProc)(db, connId);
    }
};
const connectionBashStatus = {};
const getCpuCoresMhz = async (db, connId) => {
    const coreFrequencies = await (0, statusMonitorUtils_1.execPSQLBash)(db, connId, `cat /proc/cpuinfo | grep "MHz" | sed 's/^.*: //'`);
    return coreFrequencies.map(mhzStr => {
        const mhz = Number(mhzStr);
        return Number.isFinite(mhz) ? Math.round(mhz) : -1;
    });
};
exports.getCpuCoresMhz = getCpuCoresMhz;
const getPidStatsMode = async (db, connId) => {
    const [platform] = await (0, statusMonitorUtils_1.execPSQLBash)(db, connId, "uname");
    if (platform !== "Linux") {
        return { mode: "off" };
    }
    let mode;
    const available = [];
    for await (const [program, method] of Object.entries(pidStatsMethods)) {
        if (program === "proc") {
            await method(db, connId);
            mode ??= program;
            available.push(program);
        }
        /** TODO - ensure ps & proc output same values as top for cpu */
        else {
            const [which] = await (0, statusMonitorUtils_1.execPSQLBash)(db, connId, `which ${program}`);
            if (which) {
                await method(db, connId);
                mode ??= program;
                available.push(program);
            }
        }
    }
    return {
        mode: mode || "off",
        available,
    };
};
const getPidStats = async (db, connId) => {
    connectionBashStatus[connId] ??= await getPidStatsMode(db, connId);
    const { mode } = connectionBashStatus[connId] ?? {};
    if (!mode || mode === "off")
        return undefined;
    return pidStatsMethods[mode](db, connId);
};
exports.getPidStats = getPidStats;
const getStatus = async (connId, dbs) => {
    const cdb = await (0, ConnectionManager_1.getCDB)(connId);
    const result = {
        queries: (await cdb.any(`
      /* ${statusMonitorUtils_1.IGNORE_QUERY} */
      SELECT 
        datid, datname, pid, usesysid, usename, application_name, client_addr, 
        client_hostname, client_port, backend_start, xact_start, query_start, 
        state_change, wait_event_type, wait_event, state, 
        backend_xid, backend_xmin, query, backend_type, 
        pg_blocking_pids(pid) as blocked_by,
        COALESCE(cardinality(pg_blocking_pids(pid)), 0) blocked_by_num,
        md5(pid || query) as id_query_hash
      FROM pg_catalog.pg_stat_activity
      WHERE query NOT ILIKE '%' || \${queryName} || '%'
    `, { queryName: statusMonitorUtils_1.IGNORE_QUERY })),
        blockedQueries: [],
        topQueries: [],
        noBash: connectionBashStatus[connId]?.mode === "off",
        connections: (await cdb.any(`
      /* ${statusMonitorUtils_1.IGNORE_QUERY} */
      SELECT *
      FROM pg_stat_database
      WHERE numbackends > 0;
    `)),
        ...(await cdb.one(`
      SELECT setting::numeric as "maxConnections"
      FROM pg_catalog.pg_settings
      WHERE name = 'max_connections'
    `))
    };
    let procInfo;
    try {
        procInfo = await (0, exports.getPidStats)(cdb, connId);
        result.serverStatus = procInfo?.serverStatus;
    }
    catch (err) {
        console.error(err);
    }
    await dbs.tx(async (tx) => {
        await tx.stats.delete({ connection_id: connId });
        await tx.stats.insert(result.queries.map(q => ({
            ...q,
            connection_id: connId,
        })));
        if (!procInfo)
            return;
        await tx.stats.updateBatch(procInfo.pidStats.map(({ pid, ...otherFields }) => {
            return [
                { pid, connection_id: connId, },
                {
                    ...otherFields,
                    memPretty: (0, utils_1.bytesToSize)((+otherFields.mem / 100) * procInfo.serverStatus.total_memoryKb * 1024),
                },
            ];
        }));
    });
    return result;
};
exports.getStatus = getStatus;
//# sourceMappingURL=getPidStats.js.map