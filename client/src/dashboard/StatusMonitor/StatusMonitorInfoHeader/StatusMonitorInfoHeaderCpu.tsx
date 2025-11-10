import type { ConnectionStatus } from "@common/utils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { FlexCol } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { mdiChip } from "@mdi/js";
import React from "react";
import { bytesToSize } from "../../BackupAndRestore/BackupsControls";

export const StatusMonitorInfoHeaderCpu = ({
  serverStatus,
}: Pick<ConnectionStatus, "serverStatus">) => {
  if (!serverStatus) {
    return;
  }
  const { cpu_model, cpu_mhz, cpu_cores_mhz, disk_space, ioInfo } =
    serverStatus;

  return (
    <PopupMenu
      title="Server info"
      className="f-0"
      positioning="center"
      clickCatchStyle={{ opacity: 0.5 }}
      contentClassName="flex-col gap-1 p-1"
      button={
        <Btn title="Server information" iconPath={mdiChip} variant="faded">
          Server info
        </Btn>
      }
    >
      <Chip label={"CPU Model"} variant="header">
        <span className="ws-pre">
          {cpu_model}
          <br></br>
          {cpu_mhz}
        </span>
      </Chip>
      <Chip label={"CPU Frequency"} variant="header">
        <div className="ws-pre ta-right">{cpu_cores_mhz}</div>
      </Chip>
      <Chip label={"Disk usage"} variant="header">
        <span className="ws-pre">{disk_space}</span>
      </Chip>
      {(ioInfo?.length ?? 0) > 0 && (
        <FlexCol className="gap-0 p-p5">
          <span className="text-1 font-14 ta-left">IO: </span>
          <table className="ta-left" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                <th>Device</th>
                <th>Reads</th>
                <th>Writes</th>
              </tr>
            </thead>
            <tbody>
              {ioInfo?.map((r) => (
                <tr key={r.deviceName}>
                  <td>{r.deviceName}</td>
                  <td>{bytesToSize(r.readsCompletedSuccessfully)}</td>
                  <td>{bytesToSize(r.writesCompleted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FlexCol>
      )}
    </PopupMenu>
  );
};
