import React from "react";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import { getSqlRowsAsCSV } from "./CopyResultBtn";
import type { W_SQLState } from "./W_SQL";
import { usePromise } from "prostgles-client/dist/react-hooks";

type P = Pick<W_SQLState, "cols" | "rows">;
export const CSVRender = ({ rows, cols }: P) => {
  const value = usePromise(async () => {
    return !cols?.length || !rows ?
        ""
      : await getSqlRowsAsCSV(
          rows,
          cols.map((c) => c.name),
        );
  });
  return <CodeEditor language="csv" value={value ?? ""} />;
};
