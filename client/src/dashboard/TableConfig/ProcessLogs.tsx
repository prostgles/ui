import { FlexCol, FlexRow } from "@components/Flex";
import { MonacoLogsWithFullscreen } from "@components/MonacoLogs/MonacoLogsWithFullscreen";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { FilterItem } from "prostgles-types";
import React from "react";

type P = {
  type: "tableConfig" | "onMount" | "methods";
  noMaxHeight?: boolean;
};
export const ProcessLogs = (props: P) => {
  const { type } = props;
  const { connectionId, dbs } = usePrgl();
  const { data: conn } = dbs.connections.useSubscribeOne({ id: connectionId });
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({
    $existsJoined: { connections: { id: connectionId } },
  });
  const { data: dbConfLogs } = dbs.database_config_logs.useSubscribeOne({
    $existsJoined: {
      "database_configs.connections": { id: connectionId },
    },
  } as FilterItem);
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
            {isDisabled ?
              <div>Process not started.</div>
            : <div>Runs on the primary connection server.</div>
            }
          </FlexRow>
        }
        logs={logs ?? ""}
      />
    </FlexCol>
  );
};

const options = { readOnly: true };
