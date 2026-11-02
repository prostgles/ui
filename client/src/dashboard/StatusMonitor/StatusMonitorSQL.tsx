import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import { mdiCodeBraces, mdiPlay } from "@mdi/js";
import { useIsMounted } from "prostgles-client";
import React, { useRef, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import CodeExample from "../CodeExample";
import { W_SQLEditor } from "../SQLEditor/W_SQLEditor";
import type { StatusMonitorProps } from "./StatusMonitor";

export const StatusMonitorSQL = ({ connectionId }: StatusMonitorProps) => {
  const {
    dbsMethods: { runConnectionQuery },
  } = usePrglCore();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Record<string, unknown>[]>();
  const [error, setError] = useState<unknown>();
  const [running, setRunning] = useState(false);
  const isRunning = useRef(false);
  const getIsMounted = useIsMounted();

  const runQuery = async (sql = query) => {
    if (!runConnectionQuery || !sql.trim() || isRunning.current) return;
    isRunning.current = true;
    setRunning(true);
    setError(undefined);
    setResult(undefined);
    try {
      const rows = await runConnectionQuery({
        conId: connectionId,
        query: sql,
      });
      if (getIsMounted()) setResult(rows);
    } catch (err) {
      if (getIsMounted()) setError(err);
    } finally {
      isRunning.current = false;
      if (getIsMounted()) setRunning(false);
    }
  };

  if (!runConnectionQuery) return null;

  return (
    <PopupMenu
      title="Run SQL"
      positioning="center"
      showFullscreenToggle={{}}
      onClickClose={false}
      button={<Btn iconPath={mdiCodeBraces} variant="faded">Run SQL</Btn>}
    >
      <FlexCol style={{ width: "min(800px, 80vw)" }}>
        <W_SQLEditor
          value={query}
          onChange={setQuery}
          debounce={0}
          onRun={runQuery}
          autoFocus={true}
          style={{ height: "250px" }}
          sqlOptions={{ executeOptions: "full" }}
        />
        <Btn
          iconPath={mdiPlay}
          color="action"
          variant="filled"
          className="as-end"
          disabledInfo={
            running ? "Query is running"
            : !query.trim() ?
              "Enter a SQL query"
            : undefined
          }
          onClickPromise={() => runQuery()}
        >
          {running ? "Running..." : "Run query"}
        </Btn>
        <ErrorComponent error={error} />
        {result && (
          <>
            <InfoRow color="info">
              Query completed. {result.length} rows returned.
            </InfoRow>
            {!!result.length && (
              <CodeExample
                language="json"
                value={JSON.stringify(result, null, 2)}
                options={{ readOnly: true }}
                style={{ maxHeight: "300px" }}
              />
            )}
          </>
        )}
      </FlexCol>
    </PopupMenu>
  );
};
