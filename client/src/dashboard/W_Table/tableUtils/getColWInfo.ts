import { CommonWindowProps } from "../../Dashboard/Dashboard";
import { WindowData } from "../../Dashboard/dashboardUtils";
import { ColumnConfigWInfo } from "../W_Table";

export const getColWInfo = (
  tables: CommonWindowProps["tables"],
  w: Pick<WindowData<"table">, "columns" | "table_name">
): ColumnConfigWInfo[] => {
  const { columns: cols, table_name } = w;
  let columns: ColumnConfigWInfo[] = cols || [];

  const t = tables.find(t => t.name === table_name);
  if(!t){
    console.error("Table not found:", table_name);
    return [];
  }
  const isAdditionalComputed = (c: ColumnConfigWInfo) => (c.computedConfig && !c.computedConfig.isColumn);

  //@ts-ignore
  columns = columns.map(c => ({
    ...c,
    info: isAdditionalComputed(c)? undefined : t.columns.find(_c => _c.select && _c.name === c.name),
  }))
  .filter(c => {

    /** Remove dropped columns */
    if (!c.computedConfig && !c.info && !c.nested) {
      return false;
    }
    return true;
  }) as ColumnConfigWInfo[];

  const newCols = t.columns.filter(c => !columns.find(r => r.info && r.name === c.name));

  return structuredClone(columns.concat(newCols.map(c => ({
    info: c,
    name: c.name,
    show: true,
  })))).filter(c => !c.info || c.info.select);
}