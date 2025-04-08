import { mdiChartLine, mdiChip } from "@mdi/js";
import React, { useEffect, useState } from "react";
import type { ConnectionStatus } from "../../../../commonTypes/utils";
import Btn from "../../components/Btn";
import Chip from "../../components/Chip";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import { getServerCoreInfoStr } from "../../pages/Connections/Connections";
import { isEmpty } from "../../utils";
import { bytesToSize } from "../Backup/BackupsControls";
import { useIsMounted } from "../Backup/CredentialSelector";
import type { StatusMonitorProps } from "./StatusMonitor";
import { StatusMonitorConnections } from "./StatusMonitorConnections";

export const StatusMonitorHeader = (
  props: StatusMonitorProps & {
    refreshRate: number;
    statusError: any;
    setStatusError: (e: any) => void;
    setNoBash: (noBash: boolean) => void;
  },
) => {
  const {
    getStatus,
    connectionId,
    dbs,
    dbsMethods,
    refreshRate,
    statusError,
    setStatusError,
    setNoBash,
  } = props;

  const [c, setc] = useState<ConnectionStatus>();
  const noBash = c?.noBash;
  useEffect(() => {
    setNoBash(!!noBash);
  }, [noBash, setNoBash]);
  const getIsMounted = useIsMounted();
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const c = await getStatus(connectionId);
        if (!getIsMounted()) {
          return;
        }
        setc(c);
        if (!isEmpty(c.getPidStatsErrors)) {
          console.error(c.getPidStatsErrors);
        }
      } catch (e) {
        console.error(e);
        setStatusError(e);
      }
    }, refreshRate * 1e3);

    return () => clearInterval(interval);
  }, [refreshRate, connectionId, getStatus, getIsMounted, setStatusError]);

  // const [shellResult, setShellResult] = useState("");
  // const setShell = async (v: string) => {
  //   const res = await execPSQLBash(dbs.sql!, connectionId, v);
  //   console.log(res);
  //   setShellResult(res.join("\n"));
  //   getPidStats(dbs.sql!, connectionId);
  // }
  {
    /* <FormFieldDebounced onChange={setShell} />
      <div className="ws-pre">{shellResult}</div> */
  }

  const { data: connection } = dbs.connections.useFindOne({ id: connectionId });
  const [datidFilter, setDatidFilter] = useState<number | undefined>();

  return (
    <>
      <InfoRow>Some queries used for this view have been hidden</InfoRow>
      {statusError && <ErrorComponent error={statusError} />}
      <FlexRow>
        {connection && (
          <Chip variant="header" label="Server">
            {getServerCoreInfoStr(connection)}
          </Chip>
        )}
        {c?.serverStatus && (
          <Chip className="f-0" variant="header" label="Memory used">
            {(
              (100 *
                (c.serverStatus.total_memoryKb - c.serverStatus.memAvailable)) /
              c.serverStatus.total_memoryKb
            )
              .toFixed(1)
              .padStart(2, "0")}
            % (
            {bytesToSize(
              1024 *
                (c.serverStatus.total_memoryKb - c.serverStatus.memAvailable),
            )}
            )
          </Chip>
        )}
        {c && (
          <StatusMonitorConnections
            c={c}
            datidFilter={datidFilter}
            dbsMethods={dbsMethods}
            connectionId={connectionId}
            onSetDatidFilter={setDatidFilter}
          />
        )}
        {c?.serverStatus && (
          <PopupMenu
            title="Server info"
            className="f-0"
            positioning="center"
            clickCatchStyle={{ opacity: 0.5 }}
            contentClassName="flex-col gap-1 p-1"
            button={<Btn title="Server information" iconPath={mdiChip} />}
          >
            <Chip label={"CPU Model"} variant="header">
              <span className="ws-pre">
                {c.serverStatus.cpu_model}
                <br></br>
                {c.serverStatus.cpu_mhz}
              </span>
            </Chip>
            <Chip label={"CPU Frequency"} variant="header">
              <div className="ws-pre ta-right">
                {c.serverStatus.cpu_cores_mhz}
              </div>
            </Chip>
            <Chip label={"Disk usage"} variant="header">
              <span className="ws-pre">{c.serverStatus.disk_space}</span>
            </Chip>
            {(c.serverStatus.ioInfo?.length ?? 0) > 0 && (
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
                    {c.serverStatus.ioInfo?.map((r) => (
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
        )}
      </FlexRow>
    </>
  );
};
