import { useIsMounted } from "prostgles-client/dist/react-hooks";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ProcStats } from "../../../../commonTypes/utils";
import { getAgeFromDiff } from "../../../../commonTypes/utils";
import type { Prgl } from "../../App";
import Chip from "../../components/Chip";
import { FlexCol, FlexRow } from "../../components/Flex";
import Loading from "../../components/Loading";
import { CodeEditorWithSaveButton } from "../CodeEditor/CodeEditorWithSaveButton";
import { renderInterval } from "../W_SQL/customRenderers";
import type { editor } from "../W_SQL/monacoEditorTypes";
import { Label } from "../../components/Label";

type P = Pick<Prgl, "dbsMethods" | "connectionId" | "dbs"> & {
  type: "tableConfig" | "onMount" | "methods";
  noMaxHeight?: boolean;
};
export const ProcessLogs = ({ dbsMethods, connectionId, dbs, type }: P) => {
  const { data: conn } = dbs.connections.useSubscribeOne({ id: connectionId });
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({
    $existsJoined: { connections: { id: connectionId } } as any,
  });
  const { data: dbConfLogs } = dbs.database_config_logs.useSubscribeOne({
    $existsJoined: {
      "database_configs.connections": { id: connectionId },
    } as any,
  });
  const getIsMounted = useIsMounted();
  const [editorKey, setEditorKey] = useState(Date.now().toString());
  const [procStats, setProcStats] = useState<ProcStats & { error?: any }>();
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const hasCode =
    type === "tableConfig" ? !!dbConf?.table_config_ts
    : type === "onMount" ? !!conn?.on_mount_ts
    : true;
  const isDisabled =
    (type === "tableConfig" ? dbConf?.table_config_ts_disabled
    : type === "onMount" ? conn?.on_mount_ts_disabled
    : false) || !hasCode;

  useEffect(() => {
    if (isDisabled) return;
    const interval = setInterval(async () => {
      try {
        const stats = await dbsMethods.getForkedProcStats?.(connectionId);
        if (!getIsMounted()) return;
        setProcStats(
          type === "tableConfig" ? stats?.tableConfigRunner
          : type === "onMount" ? stats?.onMountRunner
          : stats?.methodRunner,
        );
      } catch (error) {
        if (!getIsMounted()) return;
        setProcStats({
          cpu: 0,
          mem: 0,
          pid: 0,
          uptime: 0,
          error,
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [dbsMethods, type, connectionId, getIsMounted, isDisabled]);

  const logs =
    type === "tableConfig" ? dbConfLogs?.table_config_logs
    : type === "onMount" ? dbConfLogs?.on_mount_logs
    : dbConfLogs?.on_run_logs;
  const isLoading = !procStats && !isDisabled;

  /* Fix bug where logs are not rendered */
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!editorRef.current || !getIsMounted()) return;
      if (!editorRef.current.getDomNode()?.innerText.length && logs?.length) {
        setEditorKey(Date.now().toString());
      }
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [editorRef, logs, setEditorKey, getIsMounted]);

  const onMonacoEditorMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
    },
    [],
  );

  const options = { readOnly: true };

  return (
    <FlexCol className="f-1 relative">
      {isLoading && <Loading variant="cover" delay={250} />}

      <CodeEditorWithSaveButton
        key={editorKey}
        label={
          <FlexRow>
            <Label variant="normal">{isDisabled ? "Log history" : "Log"}</Label>
            {!isDisabled && (
              <>
                <Chip variant="naked" label="PID">
                  {procStats?.pid ?? "?"}
                </Chip>
                <Chip variant="naked" label="Cpu">
                  {(procStats?.cpu ?? 0).toFixed(1)}%
                </Chip>
                <Chip variant="naked" label="Mem">
                  {Math.round((procStats?.mem ?? 0) / 1e6).toLocaleString() +
                    " MB"}
                </Chip>
                <Chip variant="naked" label="Uptime">
                  {!procStats ?
                    " "
                  : renderInterval(
                      getAgeFromDiff(Math.round(procStats.uptime) * 1e3),
                      true,
                      undefined,
                      true,
                    )
                  }
                </Chip>
              </>
            )}
          </FlexRow>
        }
        onMount={onMonacoEditorMount}
        options={options}
        // style={{ minHeight: "200px", maxHeight: noMaxHeight? undefined : "300px" }}
        language="bash"
        value={logs ?? ""}
      />
    </FlexCol>
  );
};
