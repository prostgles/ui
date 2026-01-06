import { useCallback, useState } from "react";
import type { MonacoCodeInMarkdownProps } from "./MonacoCodeInMarkdown";
import { getFieldsWithActions } from "src/dashboard/W_SQL/parseSqlResultCols";
import { getSQLResultTableColumns } from "src/dashboard/W_SQL/getSQLResultTableColumns";

export const useOnRunSQL = ({
  codeString,
  sqlHandler,
}: MonacoCodeInMarkdownProps) => {
  const [sqlResult, setSqlResult] = useState<SQLResult | undefined>(undefined);

  const onRunSQL = useCallback(
    (withCommit: boolean) => {
      const queryId = crypto.randomUUID();
      const queryWithId = `--${queryId} prostgles_ui_query_id\n${codeString}`;
      setSqlResult({ state: "loading", query: queryWithId, withCommit });
      sqlHandler!(queryWithId, undefined, {
        returnType: withCommit ? "arrayMode" : "default-with-rollback",
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
            data.command?.toLowerCase() === "select",
          );
          const columns =
            !withCommit ? cols : (
              getSQLResultTableColumns({
                cols,
                tables: [],
                maxCharsPerCell: undefined,
                onResize: () => {},
              })
            );
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
    [codeString, sqlHandler],
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
