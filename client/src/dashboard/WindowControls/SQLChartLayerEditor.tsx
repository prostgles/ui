import React from "react";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import { LANG } from "../SQLEditor/W_SQLEditor";
import type { LinkSyncItem } from "../Dashboard/dashboardUtils";

type P = {
  link: LinkSyncItem;
};
export const SQLChartLayerEditor = ({ link }: P) => {
  const dataSource =
    link.options.type !== "table" ? link.options.dataSource : undefined;
  if (dataSource?.type !== "sql") {
    return <>Data source is not SQL</>;
  }
  return (
    <CodeEditor
      language={LANG}
      value={dataSource.sql}
      style={{ minWidth: "min(600px, 90vw)" }}
      onChange={(v) => {}}
      onSave={(v) => {
        link.$update(
          {
            options: {
              ...link.options,
              type: "timechart",
              dataSource: {
                type: "sql",
                sql: v,
              },
            },
          },
          { deepMerge: true },
        );
      }}
    />
  );
};
