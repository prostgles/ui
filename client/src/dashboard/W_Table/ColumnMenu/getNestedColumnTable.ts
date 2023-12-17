import { DBSchemaTablesWJoins, WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { ColumnConfig } from "./ColumnMenu";

type Result = {
  columns: ColumnConfig[];
  table: DBSchemaTablesWJoins[number];
  nestedColumn?: ColumnConfig
}
type ErrorResult = Partial<Record<keyof Result, undefined>>;

type MaybeResult = { error: string } & ErrorResult | { error?: undefined } & Result
export const getNestedColumnTable = (nestedColumnName: string | undefined, w: WindowSyncItem<"table">, tables: DBSchemaTablesWJoins): MaybeResult => {

  const columns = w.$get().columns;
  if(!columns){
    return {
      error: "w columns missing",
    }
  }
  const nestedColumn = columns.find(c => c.name === nestedColumnName);
  if(!nestedColumnName){
    const table = tables.find(t => t.name === w.table_name);
    if(!table){
      return {
        error: `Table ${w.table_name} not found`,
      }
    }
    return { 
      table, 
      columns,
    }
  }

  if(!nestedColumn){
    return {
      error: `Nested column ${nestedColumnName} not found`,
    }
  }
  if(!nestedColumn.nested){
    return {
      error: `Nested column name ${nestedColumnName} points to an invalid column`,
    }
  }

  const nTableName = nestedColumn.nested.path.at(-1)?.table
  const table = tables.find(t => t.name === nTableName);
  if(!table){
    return {
      error: `Nested column table ${nTableName} not found`,
    }
  }

  return { table, nestedColumn, columns }
}