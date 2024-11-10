import React from "react";
import type { Prgl } from "../../App";
import { FlexCol, FlexRow } from "../../components/Flex";
import { SwitchToggle } from "../../components/SwitchToggle";
import { useCodeEditorTsTypes } from "../AccessControl/Methods/useMethodDefinitionTypes";
import { SmartCodeEditor } from "../CodeEditor/SmartCodeEditor";
import { ProcessLogs } from "../TableConfig/ProcessLogs";

export const OnMountFunction = ({ dbsMethods, dbs, connectionId, dbKey }: Prgl) => {

  const { data: connection } = dbs.connections.useSubscribeOne({ id: connectionId });
  const tsLibraries = useCodeEditorTsTypes({ connectionId, dbsMethods, dbKey });
  return <FlexCol>
    <FlexRow>
      <h3>On mount</h3>
      <SwitchToggle 
        label={"Enabled"}
        disabledInfo={!connection?.on_mount_ts? "No on mount function. Provide a function or edit and save the example" : undefined}
        checked={!!connection?.on_mount_ts && !connection.on_mount_ts_disabled}
        onChange={async (checked) => {
          await dbsMethods.setOnMount?.(connectionId, { on_mount_ts_disabled: !checked });
        }} 
      />
    </FlexRow>
    <SmartCodeEditor 
      key={dbKey}
      label="Server-side function executed after the table is created and server started or schema changed"
      language={{ 
        lang: "typescript",
        modelFileName: `onMount_${connectionId}`,
        tsLibraries: [
          ...tsLibraries,
        ]
      }}
      codePlaceholder={example}
      value={connection?.on_mount_ts}
      onSave={async (value) => {
        await dbsMethods.setOnMount?.(connectionId, { on_mount_ts: value });
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
import { WebSocket } from "ws";
export const onMount: ProstglesOnMount = async ({ dbo }) => {

  await dbo.sql('CREATE TABLE IF NOT EXISTS symbols(pair text primary key);');
  await dbo.sql('CREATE TABLE IF NOT EXISTS futures (price float, symbol text, "timestamp" timestamptz);');
  const socket = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr@1s");
  
  socket.onmessage = async (rawData) => {
    const dataItems = JSON.parse(rawData.data as string);
    const data = dataItems.map(data => ({ symbol: data.s, price: data.p, timestamp: new Date(data.E) }))
    await dbo.symbols.insert(data.map(({ symbol }) => ({ pair: symbol })), { onConflict: "DoNothing" });
    await dbo.futures.insert(data);
  }
}
`