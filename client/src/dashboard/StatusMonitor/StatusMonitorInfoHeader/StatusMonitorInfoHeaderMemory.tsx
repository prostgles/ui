import type { ConnectionStatus } from "@common/utils";
import Chip from "@components/Chip";
import React from "react";
import { bytesToSize } from "../../BackupAndRestore/BackupsControls";

export const StatusMonitorInfoHeaderMemory = ({
  serverStatus,
}: Pick<ConnectionStatus, "serverStatus">) => {
  if (!serverStatus) {
    return;
  }
  const { total_memoryKb, memAvailable } = serverStatus;
  return (
    <Chip className="f-0" variant="header" label="Memory used">
      {((100 * (total_memoryKb - memAvailable)) / total_memoryKb)
        .toFixed(1)
        .padStart(2, "0")}
      % ({bytesToSize(1024 * (total_memoryKb - memAvailable))})
    </Chip>
  );
};
