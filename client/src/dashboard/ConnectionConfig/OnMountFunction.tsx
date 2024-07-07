import React from "react";
import type { Prgl } from "../../App";
import { FlexCol, FlexRow } from "../../components/Flex";
import { SwitchToggle } from "../../components/SwitchToggle";
import { useCodeEditorTsTypes } from "../AccessControl/Methods/MethodDefinition";
import { SmartCodeEditor } from "../CodeEditor/SmartCodeEditor";
import { ProcessLogs } from "../TableConfig/ProcessLogs";

export const OnMountFunction = ({ dbsMethods, dbs, connectionId, dbKey }: Prgl) => {

  const { data: dbConf } = dbs.database_configs.useSubscribeOne({ $existsJoined: { connections: { id: connectionId } } });
  const tsLibraries = useCodeEditorTsTypes({ connectionId, dbsMethods, dbKey });
  return <FlexCol>
    <FlexRow>
      <h3>On mount</h3>
      <SwitchToggle 
        label={"Enabled"}
        checked={!!dbConf?.on_mount_ts && !dbConf.on_mount_ts_disabled}
        onChange={async (checked) => {
          await dbsMethods.setOnMountAndTableConfig?.(connectionId, { on_mount_ts_disabled: !checked });
        }} 
      />
    </FlexRow>
    <SmartCodeEditor 
      key={dbKey}
      label="Server-side function executed after the table is created and server started or schema changed"
      tsLibraries={[
        ...tsLibraries,
      ]}
      codePlaceholder={example}
      language="typescript"
      value={dbConf?.on_mount_ts}
      onSave={async (value) => {
        await dbsMethods.setOnMountAndTableConfig?.(connectionId, { on_mount_ts: value });
      }}
    
    />
    <ProcessLogs 
      key={dbKey + "logs"}
      connectionId={connectionId}
      dbsMethods={dbsMethods}
      type="onMount"
      dbs={dbs}
    />
  </FlexCol>
} 
const example = `/* Example */
export const onMount: OnMount = async ({ dbo }) => {

  const socket = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr@1s");
  
  socket.onmessage = async (rawData) => {
    const dataItems = JSON.parse(rawData.data as string);
    const data = dataItems.map(data => ({ data, symbol: data.s, price: data.p, timestamp: new Date(data.E) }))
    await dbo.symbols.insert(data.map(({ symbol }) => ({ pair: symbol })), { onConflict: "DoUpdate" });
    await dbo.futures.insert(data);
  }
}
`