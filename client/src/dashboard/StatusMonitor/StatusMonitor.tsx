import { FlexCol } from "@components/Flex";
import React, { useState } from "react";
import { StatusMonitorInfoHeader } from "./StatusMonitorInfoHeader/StatusMonitorInfoHeader";
import { StatusMonitorProcList } from "./StatusMonitorProcList";

export type StatusMonitorProps = {
  connectionId: string;
};

export const StatusMonitor = (props: StatusMonitorProps) => {
  const [samplingRate, setSamplingRate] = useState(0.5);
  const [statusError, setStatusError] = useState<unknown>();
  const [noBash, setNoBash] = useState(false);

  // const [shellResult, setShellResult] = useState("");
  // const setShell = async (v: string) => {
  //   const res = await execPSQLBash(dbs.sql!, connectionId, v);
  //   console.log(res);
  //   setShellResult(res.join("\n"));
  //   getPidStats(dbs.sql!, connectionId);
  // }

  return (
    <FlexCol className="StatusMonitor w-fit min-w-0 jc-start ">
      <StatusMonitorInfoHeader
        {...props}
        samplingRate={samplingRate}
        statusError={statusError}
        setStatusError={setStatusError}
        setNoBash={setNoBash}
        setSamplingRate={setSamplingRate}
      />

      <StatusMonitorProcList
        {...props}
        samplingRate={samplingRate}
        noBash={noBash}
      />
    </FlexCol>
  );
};
