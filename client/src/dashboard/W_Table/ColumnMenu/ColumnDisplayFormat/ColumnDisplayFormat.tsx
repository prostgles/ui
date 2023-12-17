import { DBSchemaTable } from "prostgles-types";
import React from "react";
import { JSONBSchema, JSONBSchemaA } from "../../../../components/JSONBSchema/JSONBSchema";
import { ColumnConfigWInfo } from "../../W_Table";
import { DeepWriteable } from "../../../../../../commonTypes/utils";
import { ColumnFormat, ColumnFormatSchema, getFormatOptions } from "./columnFormatUtils";
import { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";

  
type P = {
  column: ColumnConfigWInfo;
  table: DBSchemaTable;
  tables: DBSchemaTablesWJoins;
  onChange: (newFormat: ColumnFormat) => void;
};


export const ColumnDisplayFormat = ({ column, table, tables, onChange }: P) => {
  const s = { ...ColumnFormatSchema } as DeepWriteable<typeof ColumnFormatSchema>;
  const allowedRenderers = getFormatOptions(column.info);
  // const textCols = table.columns.filter(c => c.tsDataType === "string").map(c => c.name);
  s.oneOfType = s.oneOfType.map(t => {
    
    if("params" in t){
      if(t.type.enum[0] === "Currency"){
        // @ts-ignore
        t.params.oneOfType[1].currencyCodeField.lookup.filter.table = table.name;
      } else if(t.type.enum[0] === "Media"){
        //@ts-ignore
        t.params.oneOfType[1]!.contentTypeColumnName!.lookup.filter.table = table.name;
      }
    }

    return t;
  }).filter(t => allowedRenderers.find(df => (t.type.enum as any).includes(df.type))) as any;

  // return <JSONBSchema
  //   schema={{ type: ColumnFormatSchema.oneOfType[7] }}
  //   tables={tables}
  //   value={column.format}
  //   onChange={onChange}
  //   />

  //@ts-ignore
  return <JSONBSchema 
    schema={s}
    tables={tables}
    value={column.format}
    onChange={onChange}
  />;
}
  