import { FlexCol, FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { SwitchToggle } from "@components/SwitchToggle";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useState } from "react";
import { useCodeEditorTsTypes } from "../AccessControl/Methods/useCodeEditorTsTypes";
import { CodeEditorWithSaveButton } from "../CodeEditor/CodeEditorWithSaveButton";
import { ProcessLogs } from "../TableConfig/ProcessLogs";
import { PublishedMethods } from "../W_Method/PublishedMethods";

export const ServerSideFunctions = () => {
  const { dbsMethods, dbs, connectionId, dbKey, tables } = usePrgl();
  const { data: connection } = dbs.connections.useSubscribeOne({
    id: connectionId,
  });
  const languageObj = useCodeEditorTsTypes({
    connectionId,
    dbsMethods,
    dbKey,
    tables,
    dbs,
    method: undefined,
  });
  const { setOnMount } = dbsMethods;

  const onSave = useCallback(
    async (value: string) => {
      await setOnMount?.({
        connId: connectionId,
        changes: { on_mount_ts: value },
      });
    },
    [setOnMount, connectionId],
  );
  /**
   * Hiding PublishedMethods until OnMountFunction is loaded
   * is done to prevent flaky tests when creating function
   */
  const [libsLoaded, setLibsLoaded] = useState(false);

  const onLoaded = useCallback(() => {
    setLibsLoaded(true);
  }, []);
  if (!connection) return <Loading />;

  return (
    <FlexCol className="w-full" style={{ gap: "2em" }}>
      <FlexRow>
        <h3>On mount</h3>
        <SwitchToggle
          label={"Enabled"}
          disabledInfo={
            !connection.on_mount_ts ?
              "No on mount function. Provide a function or edit and save the example"
            : undefined
          }
          data-command="ServerSideFunctions.onMountEnabled"
          checked={!!connection.on_mount_ts && !connection.on_mount_ts_disabled}
          onChange={async (checked) => {
            await dbsMethods.setOnMount?.({
              connId: connectionId,
              changes: {
                on_mount_ts_disabled: !checked,
              },
            });
          }}
        />
      </FlexRow>
      <FlexCol>
        {languageObj && (
          <>
            <CodeEditorWithSaveButton
              key={dbKey}
              label="Server-side function executed after the table is created and server started or schema changed"
              language={languageObj}
              codePlaceholder={example}
              value={connection.on_mount_ts}
              onSave={onSave}
              onTSLibraryChange={onLoaded}
            />
            <ProcessLogs key={dbKey + "logs"} type="onMount" />
          </>
        )}
      </FlexCol>
      {!libsLoaded ?
        <Loading />
      : <PublishedMethods editedRule={undefined} accessRuleId={undefined} />}
    </FlexCol>
  );
};

const example = `/* Example */
import { WebSocket } from "ws";
export const onMount: ProstglesOnMount = async ({ dbo, sql }) => {

  await sql('CREATE TABLE IF NOT EXISTS symbols(pair text primary key);');
  await sql('CREATE TABLE IF NOT EXISTS futures (price float, symbol text, "timestamp" timestamptz);');
  const socket = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr@1s");
  
  socket.onmessage = async (rawData) => {
    const dataItems = JSON.parse(rawData.data as string);
    const data = dataItems.map(data => ({ symbol: data.s, price: data.p, timestamp: new Date(data.E) }))
    await dbo.symbols.insert(data.map(({ symbol }) => ({ pair: symbol })), { onConflict: "DoNothing" });
    await dbo.futures.insert(data);
  }
}
`;
