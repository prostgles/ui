import { usePromise } from "prostgles-client/dist/prostgles";
import type { TSLibrary } from "../../CodeEditor/CodeEditor";
import type { MethodDefinitionProps } from "./MethodDefinition";
import { dboLib, wsLib } from "../../CodeEditor/monacoTsLibs";

export const useCodeEditorTsTypes = ({ connectionId, dbsMethods, dbKey }: Pick<MethodDefinitionProps, "dbsMethods" | "connectionId" | "dbKey">) => {

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
  ] satisfies TSLibrary[];
}

export const useMethodDefinitionTypes = ({ tables, method }: Pick<MethodDefinitionProps, "tables" | "method">) => {

  const tsMethodDef = `
  type ProstglesMethod = (
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

  return { tsMethodDef }
}