import { mdiCodeJson } from "@mdi/js";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import React, { useState } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { Prgl } from "../../../App";
import Btn from "../../../components/Btn";
import FormField from "../../../components/FormField/FormField";
import { JSONBSchema } from "../../../components/JSONBSchema/JSONBSchema";
import { Section } from "../../../components/Section";
import type { CodeEditorProps } from "../../CodeEditor/CodeEditor";
import CodeEditor from "../../CodeEditor/CodeEditor";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { dboLib, wsLib } from "../../CodeEditor/monacoTsLibs";
import { FlexCol } from "../../../components/Flex";
 
type P = { 
  onChange: (newMethod: P["method"]) => void;
  method: Partial<DBSSchema["published_methods"]>;
} & Pick<Prgl, "tables" | "dbsTables" | "db" | "theme" | "connectionId" | "dbsMethods" | "dbKey">;

export const useCodeEditorTsTypes = ({ connectionId, dbsMethods, dbKey }: Pick<P, "dbsMethods" | "connectionId" | "dbKey">) => {

  const dbSchemaTypes = usePromise(async () => {
    if(dbsMethods.getAPITSDefinitions && connectionId && dbKey){
      const dbSchemaTypes = await dbsMethods.getConnectionDBTypes?.(connectionId)
      return dbSchemaTypes;
    }
  }, [dbsMethods, connectionId, dbKey]);

  return [
    { 
      filePath: "file:///node_modules/@types/ws/index.d.ts", 
      content: wsLib
    },
    {
      filePath: "file:///node_modules/@types/dbo/index.d.ts",
      content: `declare global { ${dboLib} }; export {}`
    },
    { 
      filePath: "file:///DBSchemaGenerated.ts", 
      content: `declare global {   ${dbSchemaTypes ?? ""} }; export {}`
    },
    {
      filePath: "file:///node_modules/@types/onMount/index.d.ts",
      content: `declare global { 
        /**
         * Function that will be called after the table is created and server started or schema changed
         */
        export type OnMount = (args: { dbo: Required<DBOFullyTyped<DBSchemaGenerated>>; db: any; }) => void | Promise<void>; 
      }; 
      export {}      `
    },
  ] satisfies CodeEditorProps["tsLibraries"];
}

export const MethodDefinition = ({ onChange, method, tables, dbsTables, db, theme, connectionId, dbsMethods, dbKey }: P) => {

  const tsLibraries = useCodeEditorTsTypes({ connectionId, dbsMethods, dbKey });

  const methodsTable = dbsTables.find(t => t.name === "published_methods");
  const methodArgsCol = methodsTable?.columns.find(c => c.name === "arguments");

const tsMethodDef = `
type MyMethod = (
  args: { \n${method.arguments?.map(a => {
    let type: string = a.type;
    if(a.type === "Lookup" && a.lookup as any){
      const refT = tables.find(t => t.name === a.lookup.table);
      if(refT){
        if(a.lookup.isFullRow){
          type = `{ ${refT.columns.map(c => `${c.name}: ${c.tsDataType}`).join("; ")} }`;
        } else {
          const col = refT.columns.find(c => c.name === a.lookup!.column);
          if(col){
            type = col.tsDataType;
          }
        }
      }
    }
    return `    ${a.name}${a.optional? "?" : ""}: ${type};\n`;
    
  }).join("")} \n},
  ctx: { 
    db: any; 
    dbo: DBOFullyTyped<DBSchemaGenerated>; 
    tables: any[]; 
    user: any;
  }
) => Promise<any>`;

  const [editAsJSON, seteditAsJSON] = useState(false);

  const jsonSchemas = [
    {
      id: "published_methods",
      schema: getJSONBSchemaAsJSONSchema("published_methods", "arguments", { type: { 
        ...methodsTable?.columns.filter(c => ["arguments"].includes(c.name)).reduce((a, v) => ({ ...a, [v.name]: { type: v.tsDataType, nullable: v.is_nullable } }), {}),
        arguments: methodArgsCol?.jsonbSchema as any 
      }})
    }
  ];

  return <div className="MethodDefinition flex-col f-1" > 
    <div className="flex-row ai-center gap-1"> 
      <Btn title="Edit as JSON"
        className="ml-auto"
        iconPath={mdiCodeJson} 
        color={editAsJSON? "action" : undefined}
        variant={editAsJSON? "filled" : undefined}
        onClick={() => { seteditAsJSON(!editAsJSON) }}
      /> 
    </div>
    {editAsJSON? 
      <CodeEditor 
        style={{ minWidth: "600px", minHeight: "400px" }}
        language="json" 
        value={JSON.stringify(method, null, 2)}
        jsonSchemas={jsonSchemas}
        options={{
          theme: `vs-${theme}`,
        }}
        onChange={val => {
          try {
            const newMethod = JSON.parse(val);
            onChange(newMethod)
          } catch(err){

          }
        }} 
      /> : 
      <>
      <div className="flex-row-wrap gap-1" title="Method name">
        <FormField label="Name"  
          value={method.name} 
          onChange={name => {
            onChange({ ...method, name })
          }} 
        />
        <FormField 
          type="text" 
          value={method.description} 
          label="Description" 
          onChange={description => onChange({ ...method, description })} 
        />
      </div>
      {method.name && <div className="flex-col gap-1 f-1">
        <JSONBSchema 
          className="mt-1"
          schema={methodArgsCol!.jsonbSchema!} 
          value={method.arguments} 
          onChange={a => {
            onChange({ ...method, arguments: a })
          }}
          db={db}
          tables={tables}
        />
        <JSONBSchema className="mt-1"
          schema={{
            title: "Display table",
            description: "Table that will be displayed below controls and inputs",
            optional: true,
            lookup: {
              type: "schema",
              object: "table",
            }
          }} 
          value={method.outputTable} 
          onChange={outputTable => {
            onChange({ ...method, outputTable })
          }}
          db={db}
          tables={tables}
        /> 
        <Section 
          className="f-1" 
          title="Function definition" 
          contentClassName="flex-col p-1 f-1" 
          open={true}
        >
          <FlexCol className="p-1">
            <p className="ta-start m-0">
              Server-side TypeScript function triggered by a button press
            </p>
            <p className="ta-start m-0">
              Any returned value will be shown as JSON to the client
            </p>
          </FlexCol>
          <CodeEditor 
            key={tsMethodDef}
            className="f-1 ml-1 "
            tsLibraries={[
              ...tsLibraries,
              { filePath: "file:///MyMethod.ts", content: tsMethodDef },
            ]}
            style={{ minWidth: "600px", minHeight: "200px"}}
            language="typescript"
            value={method.run ?? ""}
            options={{
              theme: `vs-${theme}`,
              "glyphMargin": false,
              "lineNumbersMinChars": 0
            }}
            onChange={run => onChange({ ...method, run })}
          />
        </Section>
      </div>}
    </>}

  </div>
}
