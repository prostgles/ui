import { mdiAlert, mdiCodeJson, mdiContentCopy, mdiDownload, mdiLanguageTypescript, mdiText } from "@mdi/js";
import Papa from 'papaparse';
import { SQLHandler, ValidatedColumnInfo } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { Label } from "../../components/Label";
import Loading from "../../components/Loading";
import { PopupMenuList } from "../../components/PopupMenuList";
import { sliceText } from "../SmartFilter/SmartFilter";
import { download } from "./W_SQL";
import { Unpromise } from "./W_SQLMenu";
import { isObject } from "../../../../commonTypes/publishUtils";
import { useAsyncEffectQueue, usePromise } from "prostgles-client/dist/react-hooks";

const getValidPGColumnNames = async (v: string[], sql: SQLHandler): Promise<{ name: string; escaped: string; }[]> => {
  return sql("SELECT name, format('%I', name) as escaped FROM unnest($1::TEXT[]) as name", [v], { returnType: "rows" }) as any;
}

type Outputs = { val: string; label: string; iconPath: string; fileName: string; }[]
export const CopyResultBtn = (props: { sql: SQLHandler; rows: any[][]; cols: Pick<ValidatedColumnInfo, "name" | "tsDataType" | "udt_name">[] }) => {
  const { cols, rows: rawValues, sql } = props;
  const rows = rawValues.map(getStringifiedObjects)
  const res = usePromise(async () => {

    try {
      let escapedNames: Unpromise<ReturnType<typeof getValidPGColumnNames>> = []
      if(!cols.length || !rows.length) return;
      try {
        escapedNames = await getValidPGColumnNames(cols.map(c => c.name), sql);
      } catch(err){
        console.error(err, cols)
      }
      const _cols = await Promise.all(cols.map(async (c, ci)=> {
  
        const name: string = escapedNames.find(en => en.name === c.name)?.escaped ?? JSON.stringify(c.name);

        const vals = rows.map(r => r[ci]);
        return {
          ...c,
          name,
          nullable: vals.includes(null)? " | null": "",
          undef: vals.includes(undefined)? " | undefined" : "",
        }
      }));


      const ts = `type Result = { \n${_cols.map(c => `  ${c.name}: ${c.tsDataType}${c.nullable}${c.undef};`).join("\n") } \n}`;
      const tsv = [
        cols.map(c => JSON.stringify(c.name)), 
        ...rows
      ].map(v => v.join("\t")).join("\n");
  
      const csv = getSqlRowsAsCSV(rows, cols.map(c => c.name));
      const json = JSON.stringify(rows.map(r => r.reduce((a, v, ri) => ({ ...a, [cols[ri]!.name]: v }), {})));
      const sqlResult = [
        `SELECT *`,
        `INTO new_table_name`,
        `FROM (`,
        `  VALUES `,
          rows.map(values => {
            const rowStr = "    ("  + values.map(v => {
              return typeof v === "string"? `'${(v).replaceAll("'", "''").replaceAll("\n", "\\n")}'` : v;
            }).join(", ") + ")";
            return rowStr;
          }).join(",\n"),
        `) AS result(${cols.map(c => JSON.stringify(c.name))}) `,
      ].join("\n")
      const outputs: Outputs = [
        { val: tsv,    label: "Copy as TSV", iconPath: mdiText, fileName: "result.tsv" } ,
        { val: csv,   label: "Copy as CSV", iconPath: mdiText, fileName: "result.csv" } ,
        { val: sqlResult,   label: "Copy as SELECT INTO", iconPath: mdiText, fileName: "result.sql" } ,
        { val: json,  label: "Copy as JSON", iconPath: mdiCodeJson, fileName: "result.json" } ,
        { val: ts,   label: "Copy Typescript definition", iconPath: mdiLanguageTypescript, fileName: "result.d.ts" }    
      ];
      return {
        outputs,
        error: undefined
      }
    } catch (err){
      return {
        outputs: undefined,
        error: err
      }
    }
  }, [cols, rows]);
  const { outputs, error } = res ?? {};

  if(error) return <Label iconPath={mdiAlert} label="" popupTitle="Cannot copy result" info={<ErrorComponent error={error} />} />

  if(!cols.length || !outputs?.length) return null;
  
  return <PopupMenuList 
    button={
      <Btn 
        title={`Copy result (${rows.length} rows)`} 
        size="small"
        iconPath={mdiContentCopy} 
        
      />
    }
    listStyle={{
      color: "var(--gray-600)",
      flex: 1,
      display: "flex"
    }}
    items={outputs.map(o => ({

      leftIconPath: o.iconPath,
      label: o.label,
      title: sliceText(o.val, 100),
      iconStyle: { color: "var(--gray-400)" },
      labelStyle: { width: "100%", flex: 1 },
      onPress() {
        navigator.clipboard.writeText(o.val); 
      },
      contentRight: (
        <Btn 
          className="show-on-parent-hover" 
          iconPath={mdiDownload} 
          title="Download file" 
          onClick={() => { download(o.val, o.fileName, "text") }} 
        />
      ),
    }))}
  />  
}

const getStringifiedObjects = (values: any[]) => {
  return values.map(value => (isObject(value) || Array.isArray(value))? JSON.stringify(value) : value )
}

export const getSqlRowsAsCSV = (rows: any[][], columnNames: string[]) => {
  return Papa.unparse([columnNames, ...rows.map(row => getStringifiedObjects(row))], { 
    quotes: true, 
    header: false,
    columns: columnNames
  });
}