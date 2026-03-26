import type { ProcStats } from "@common/utils";
import { getAgeFromDiff } from "@common/utils";
import Chip from "@components/Chip";
import { FlexCol, FlexRow } from "@components/Flex";
import { MonacoLogsWithFullscreen } from "@components/MonacoLogs/MonacoLogsWithFullscreen";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useIsMounted } from "prostgles-client";
import type { FilterItem } from "prostgles-types";
import React, { useEffect, useState } from "react";
import { getPGIntervalAsText } from "../W_SQL/customRenderers";

type P = {
  type: "tableConfig" | "onMount" | "methods";
  noMaxHeight?: boolean;
};
export const ProcessLogs = (props: P) => {
  const { type } = props;
  const { dbsMethods, connectionId, dbs } = usePrgl();
  const { data: conn } = dbs.connections.useSubscribeOne({ id: connectionId });
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({
    $existsJoined: { connections: { id: connectionId } },
  } as FilterItem);
  const { data: dbConfLogs } = dbs.database_config_logs.useSubscribeOne({
    $existsJoined: {
      "database_configs.connections": { id: connectionId },
    },
  } as FilterItem);
  const getIsMounted = useIsMounted();
  const [procStats, setProcStats] = useState<ProcStats & { error?: any }>();
  const hasCode =
    type === "tableConfig" ? !!dbConf?.table_config_ts
    : type === "onMount" ? !!conn?.on_mount_ts
    : true;
  const isDisabled =
    conn?.is_state_db ||
    (type === "tableConfig" ? dbConf?.table_config_ts_disabled
    : type === "onMount" ? conn?.on_mount_ts_disabled
    : false) ||
    !hasCode;

  useEffect(() => {
    if (isDisabled) return;
    const interval = setInterval(async () => {
      try {
        const stats = await dbsMethods.getForkedProcStats?.({ connectionId });
        if (!getIsMounted()) return;
        setProcStats(
          type === "tableConfig" ? stats?.tableConfigRunner
          : type === "onMount" ? stats?.onMountRunner
          : stats?.methodRunner,
        );
      } catch (error) {
        if (!getIsMounted()) return;
        setProcStats({
          cpu: 0,
          mem: 0,
          pid: 0,
          uptime: 0,
          error,
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [dbsMethods, type, connectionId, getIsMounted, isDisabled]);

  const logs =
    type === "tableConfig" ? dbConfLogs?.table_config_logs
    : type === "onMount" ? dbConfLogs?.on_mount_logs
    : dbConfLogs?.on_run_logs;

  if (conn?.is_state_db) {
    return (
      <FlexCol className="f-1 relative">
        <div className="p-2">
          Process logs are not available for state database connection.
        </div>
      </FlexCol>
    );
  }
  return (
    <FlexCol className="f-1 relative">
      <MonacoLogsWithFullscreen
        label={
          <FlexRow className="px-p5">
            {isDisabled || !procStats ?
              <div>Process not started.</div>
            : <>
                <Chip variant="naked" label="PID">
                  {procStats.pid}
                </Chip>
                <Chip variant="naked" label="Cpu">
                  {procStats.cpu.toFixed(1)}%
                </Chip>
                <Chip variant="naked" label="Mem">
                  {Math.round(procStats.mem / 1e6).toLocaleString() + " MB"}
                </Chip>
                <Chip variant="naked" label="Uptime">
                  {getPGIntervalAsText(
                    getAgeFromDiff(Math.round(procStats.uptime) * 1e3),
                    true,
                    undefined,
                    true,
                  )}
                </Chip>
              </>
            }
          </FlexRow>
        }
        logs={logs ?? ""}
      />
    </FlexCol>
  );
};

const options = { readOnly: true };
