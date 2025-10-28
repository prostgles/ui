import React, { useState } from "react";
import type { PrglState } from "../../App";
import { FlexCol } from "@components/Flex";
import type { DBSMethods } from "../Dashboard/DBS";
import { StatusMonitorHeader } from "./StatusMonitorHeader";
import { StatusMonitorProcList } from "./StatusMonitorProcList";

export type StatusMonitorProps = Pick<
  PrglState,
  "dbs" | "dbsMethods" | "dbsTables"
> & {
  connectionId: string;
  getStatus: Required<DBSMethods>["getStatus"];
  runConnectionQuery: Required<DBSMethods>["runConnectionQuery"];
};

export const StatusMonitor = (props: StatusMonitorProps) => {
  const [samplingRate, setSamplingRate] = useState(0.5);
  const [statusError, setStatusError] = useState<any>();
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
      <StatusMonitorHeader
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
