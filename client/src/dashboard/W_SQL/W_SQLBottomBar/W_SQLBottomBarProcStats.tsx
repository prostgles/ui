import React, { useEffect, useState } from "react";
import { FlexRow } from "../../../components/Flex";
import type { W_SQLBottomBarProps } from "./W_SQLBottomBar";
import { useIsMounted } from "prostgles-client/dist/react-hooks";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Chip from "../../../components/Chip";

export const W_SQLBottomBarProcStats = ({
  dbsMethods,
  dbs,
  connectionId,
  activeQuery,
}: W_SQLBottomBarProps) => {
  const { getStatus } = dbsMethods;
  const getIsMounted = useIsMounted();
  const [procStats, setProcStats] = useState<DBSSchema["stats"] | undefined>();
  useEffect(() => {
    const pid = activeQuery?.pid;
    if (!getStatus || (activeQuery?.state !== "running" && pid)) return;
    const interval = setInterval(async () => {
      await getStatus(connectionId);
      const procInfo = await dbs.stats.findOne({
        connection_id: connectionId,
        pid,
      });
      if (!getIsMounted()) return clearInterval(interval);
      setProcStats(procInfo);
    }, 1e3);

    return () => clearInterval(interval);
  }, [activeQuery, getStatus, connectionId, getIsMounted, dbs]);

  if (!procStats) return null;
  return (
    <FlexRow title={activeQuery?.pid ? `PID ${activeQuery.pid}` : ""}>
      <Chip label="pid" value={procStats.pid} />
      <Chip
        label="CPU"
        value={`${Number(procStats.cpu || 0).toFixed(1)}% ${procStats.mhz ? `${procStats.mhz}Mhz` : ""}`}
      />
      <Chip label="Mem" value={procStats.memPretty ?? ""} />
      {procStats.wait_event && (
        <Chip label="Wait Event" value={procStats.wait_event} />
      )}
      {procStats.wait_event_type && (
        <Chip label="Wait Event Type" value={procStats.wait_event_type} />
      )}
      {(procStats.blocked_by?.length ?? 0) > 0 && (
        <FlexRow>
          Blocked by:
          {procStats.blocked_by?.map((pid, i) => (
            <Chip key={pid} className="mt-p25" color="red">
              {pid}
            </Chip>
          ))}
        </FlexRow>
      )}
    </FlexRow>
  );
};
