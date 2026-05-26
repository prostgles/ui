import { type ConnectionStatus } from "@common/utils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { FlexCol } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { mdiChip } from "@mdi/js";
import React from "react";
import { bytesToSize } from "../../BackupAndRestore/BackupsControls";

export const StatusMonitorInfoHeaderCpu = ({
  serverStatus,
}: {
  serverStatus: NonNullable<ConnectionStatus["serverStatus"]>;
}) => {
  const { cpu_model, cpu_mhz, cpu_cores_mhz, disk_space, ioInfo } =
    serverStatus;

  // const [cpuCoreTimeChartData, setCpuCoreTimeChartData] = useState<
  //   Map<string, { date: number; value: number }[]>
  // >(new Map());

  // useEffect(() => {
  //   if (serverStatus.cpu_cores_mhz) {
  //     setCpuCoreTimeChartData((prev) => {
  //       const newMap = new Map(prev);
  //       serverStatus.cpu_cores_mhz.split("\n").forEach((core, i) => {
  //         const name = `Core ${i + 1}`;
  //         const value = +core;
  //         const prevData = newMap.get(name) || [];
  //         newMap.set(name, [...prevData, { date: Date.now(), value }]);
  //       });
  //       return newMap;
  //     });
  //   }
  // }, [serverStatus.cpu_cores_mhz]);

  // const timechartLayers = useMemo(() => {
  //   return Array.from(cpuCoreTimeChartData.entries())
  //     .map(([key, data], index) => {
  //       if (data.length < 2) {
  //         return;
  //       }
  //       return {
  //         label: key,
  //         getYLabel: ({ value }) => `${value.toFixed(2)} MHz`,
  //         fullExtent: [
  //           new Date(data[0]!.date),
  //           new Date(data.at(-1)!.date),
  //         ] as [Date, Date],
  //         cols: [],
  //         color: chipColors[index]?.color ?? chipColors.at(-1)!.color,
  //         data,
  //       };
  //     })
  //     .filter(isDefined);
  // }, [cpuCoreTimeChartData]);

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
      {/* {timechartLayers.length > 0 && (
        <TimeChart
          style={{
            width: "600px",
            // height: "600px",
          }}
          renderStyle="smooth"
          binSize={10_000}
          layers={timechartLayers}
          showXAxis={true}
          yAxisScaleMode="single"
        />
      )} */}
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
