import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useCallback, useState } from "react";
import { getFieldsWithActions } from "src/dashboard/W_SQL/parseSqlResultCols";
import type { MonacoCodeInMarkdownProps } from "./MonacoCodeInMarkdown";

export const useOnRunSQL = ({ codeString }: MonacoCodeInMarkdownProps) => {
  const [sqlResult, setSqlResult] = useState<SQLResult | undefined>(undefined);

  const {
    dbsMethods: { runSql },
    connectionId,
  } = usePrgl();
  const onRunSQL = useCallback(
    (withCommit: boolean) => {
      const queryId = crypto.randomUUID();
      const queryWithId = `--${queryId} prostgles_ui_query_id\n${codeString}`;
      setSqlResult({ state: "loading", query: queryWithId, withCommit });
      runSql!({
        query: queryWithId,
        connectionId,
        mode: withCommit ? "default" : "readOnly",
      })
        .then((data) => {
          if (!data.fields.length) {
            setSqlResult({
              state: "ok-command-result",
              commandResult: `${data.command || "sql"} executed successfully`,
            });
            setTimeout(() => {
              setSqlResult(undefined);
            }, 2000);
            return;
          }
          const cols = getFieldsWithActions(
            data.fields,
            (data.command as string | undefined)?.toLowerCase() === "select",
          );
          const columns = cols;
          setSqlResult({
            state: "ok",
            rows: data.rows,
            columns,
          });
        })
        .catch((err) => {
          setSqlResult({ state: "error", error: err });
        });
    },
    [codeString, connectionId, runSql],
  );

  return {
    sqlResult,
    setSqlResult,
    onRunSQL,
  };
};

type SQLResult =
  | { state: "ok"; rows: any[]; columns: any[] }
  | { state: "ok-command-result"; commandResult: string }
  | { state: "error"; error: unknown }
  | { state: "loading"; query: string; withCommit: boolean };
