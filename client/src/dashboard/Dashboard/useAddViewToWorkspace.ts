import type { DetailedFilter } from "@common/filterUtils";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { type WindowData } from "./dashboardUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import { useCallback } from "react";
import type { Prgl } from "src/App";

export type AddViewToWorkspaceArgs = {
  type: "sql" | "table" | "method";
  workspace_id: string;
  table?: string;
  fullscreen?: boolean;
  filter?: DetailedFilter[];
  sql?: string;
  name?: string;
  method_name?: string;
};

export const useAddViewToWorkspace = () => {
  const { db, dbs } = usePrgl();
  const { onErrorAlert } = useOnErrorAlert();

  const addViewToWorkspaceWithErrorAlert = useCallback(
    async (args: AddViewToWorkspaceArgs) => {
      await onErrorAlert(async () => {
        await addViewToWorkspace(args, { db, dbs });
      });
    },
    [db, dbs, onErrorAlert],
  );

  return { addViewToWorkspace: addViewToWorkspaceWithErrorAlert };
};

export const addViewToWorkspace = async (
  args: AddViewToWorkspaceArgs,
  { db, dbs }: Pick<Prgl, "db" | "dbs">,
) => {
  const {
    type,
    table = null,
    filter = [],
    sql = "",
    name = table,
    method_name,
    workspace_id,
  } = args;
  let options: WindowData["options"] = { hideTable: true };
  const defaultTableOptions: WindowData["options"] = {
    maxCellChars: 500,
    showFilters: filter.length ? true : false,
    refresh: { type: "Realtime", throttleSeconds: 1, intervalSeconds: 1 },
  };
  let table_oid: number | undefined;
  if (table) {
    const tableHandler = db[table];
    if (tableHandler?.getInfo) {
      if ("getInfo" in tableHandler) {
        const info = await tableHandler.getInfo();
        table_oid = info.oid;
      }
      options = defaultTableOptions;
    } else {
      const err =
        db[table] ?
          "Not allowed to view data from this table"
        : "Table not found";
      alert(err);
      throw err;
    }
  }

  const r = await dbs.windows.insert(
    {
      sql,
      filter,
      options,
      type,
      table_name: table,
      table_oid,
      name,
      method_name,
      fullscreen: false,
      workspace_id,
      /** TODO: add auth to client schema */
      last_updated: undefined as any,
      user_id: undefined as any,
    },
    { returning: "*" },
  );
  return r.id;
};
