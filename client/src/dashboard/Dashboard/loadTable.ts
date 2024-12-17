import type { SmartGroupFilter } from "../../../../commonTypes/filterUtils";
import type { Prgl } from "../../App";
import { type WindowData } from "./dashboardUtils";

export type LoadTableArgs = Pick<Prgl, "db" | "dbs"> & {
  type: "sql" | "table" | "method";
  workspace_id: string;
  table?: string;
  fullscreen?: boolean;
  filter?: SmartGroupFilter;
  sql?: string;
  name?: string;
  method_name?: string;
};

export const loadTable = async (args: LoadTableArgs): Promise<string> => {
  const {
    db,
    dbs,
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
    showFilters: false,
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

  const r: WindowData = (await dbs.windows.insert(
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
    } as any,
    { returning: "*" },
  )) as any;
  return r.id;
};
