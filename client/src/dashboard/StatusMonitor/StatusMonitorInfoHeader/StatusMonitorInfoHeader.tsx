import type { ConnectionStatus } from "@common/utils";
import Chip from "@components/Chip";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRow } from "@components/Flex";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { InfoRow } from "@components/InfoRow";
import React, { useEffect, useState } from "react";
import { getServerCoreInfoStr } from "../../../pages/Connections/useConnectionServersList";
import { isEmpty } from "../../../utils";
import { useIsMounted } from "../../BackupAndRestore/CredentialSelector";
import type { StatusMonitorProps } from "../StatusMonitor";
import { StatusMonitorConnections } from "../StatusMonitorConnections";
import { StatusMonitorInfoHeaderCpu } from "./StatusMonitorInfoHeaderCpu";
import { StatusMonitorInfoHeaderMemory } from "./StatusMonitorInfoHeaderMemory";

export const StatusMonitorInfoHeader = (
  props: StatusMonitorProps & {
    samplingRate: number;
    statusError: any;
    setStatusError: (e: any) => void;
    setNoBash: (noBash: boolean) => void;
    setSamplingRate: (rate: number) => void;
  },
) => {
  const {
    getStatus,
    connectionId,
    dbs,
    dbsMethods,
    samplingRate,
    statusError,
    setStatusError,
    setNoBash,
    setSamplingRate,
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
        setStatusError(undefined);
      } catch (e) {
        console.error(e);
        setStatusError(e);
      }
    }, samplingRate * 1e3);

    return () => clearInterval(interval);
  }, [samplingRate, connectionId, getStatus, getIsMounted, setStatusError]);

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
      {statusError && <ErrorComponent error={statusError} />}
      <FlexRow>
        {connection && (
          <Chip variant="header" label="Server">
            {getServerCoreInfoStr(connection)}
          </Chip>
        )}
        <StatusMonitorInfoHeaderMemory serverStatus={c?.serverStatus} />
        {c && (
          <StatusMonitorConnections
            c={c}
            datidFilter={datidFilter}
            dbsMethods={dbsMethods}
            connectionId={connectionId}
            onSetDatidFilter={setDatidFilter}
          />
        )}
        <StatusMonitorInfoHeaderCpu serverStatus={c?.serverStatus} />

        <FormFieldDebounced
          label={"Sampling rate (s)"}
          variant="row"
          type="number"
          className="w-fit f-0  ml-auto"
          value={samplingRate}
          inputStyle={{
            maxWidth: "4rem",
          }}
          wrapperStyle={{ flexDirection: "row" }}
          onChange={(v) => {
            if (v < 0.1) return;
            setSamplingRate(v);
          }}
          inputProps={{ min: 0.1, max: 100, step: 0.1 }}
        />
      </FlexRow>
    </>
  );
};
