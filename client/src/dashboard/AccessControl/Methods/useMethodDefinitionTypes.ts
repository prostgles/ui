import { usePromise } from "prostgles-client/dist/prostgles";
import type { TSLibrary } from "../../CodeEditor/CodeEditor";
import type { MethodDefinitionProps } from "./MethodDefinition";
import { dboLib, pgPromiseDb, wsLib } from "../../CodeEditor/monacoTsLibs";

export const useCodeEditorTsTypes = ({
  connectionId,
  dbsMethods,
  dbKey,
}: Pick<MethodDefinitionProps, "dbsMethods" | "connectionId" | "dbKey">) => {
  const dbSchemaTypes = usePromise(async () => {
    if (dbsMethods.getAPITSDefinitions && connectionId && dbKey) {
      const dbSchemaTypes =
        await dbsMethods.getConnectionDBTypes?.(connectionId);
      return dbSchemaTypes;
    }
  }, [dbsMethods, connectionId, dbKey]);

  return [
    {
      filePath: "file:///node_modules/@types/ws/index.d.ts",
      content: wsLib,
    },
    {
      filePath: "file:///node_modules/@types/dbo/index.d.ts",
      content: `declare global { ${dboLib} }; export {}`,
    },
    {
      filePath: "file:///pgPromiseDb.ts",
      content: pgPromiseDb,
    },
    {
      filePath: "file:///DBGeneratedSchema.ts",
      content: `declare global {   ${dbSchemaTypes?.dbSchema ?? ""} }; export {}`,
    },
    {
      filePath: "file:///node_modules/@types/ProstglesOnMount/index.d.ts",
      content: `declare global { 
        /**
         * Function that will be called after the table is created and server started or schema changed
         */
        export type ProstglesOnMount = (args: { dbo: Required<DBOFullyTyped<DBGeneratedSchema>>; db: pgPromise.DB; }) => void | Promise<void>; 
      }; 
      export {} `,
    },
  ] satisfies TSLibrary[];
};

export const useMethodDefinitionTypes = ({
  tables,
  method,
  dbs,
}: Pick<MethodDefinitionProps, "tables" | "method" | "dbs">) => {
  const argumentTypes = method.arguments?.map((a) => {
    let type: string = a.type;
    if (a.type === "Lookup" && (a.lookup as any)) {
      const refT = tables.find((t) => t.name === a.lookup.table);
      if (refT) {
        if (a.lookup.isFullRow) {
          type = `{ ${refT.columns.map((c) => `${c.name}: ${c.tsDataType}`).join("; ")} }`;
        } else {
          const col = refT.columns.find((c) => c.name === a.lookup!.column);
          if (col) {
            type = col.tsDataType;
          }
        }
      }
    }
    return `    ${a.name}${a.optional ? "?" : ""}: ${type};\n`;
  });
  const argumentType =
    argumentTypes?.length ? `{ \n${argumentTypes.join("")} \n}` : "never";

  const { data: userTypes } = dbs.user_types.useFind();
  const userTypesTs =
    userTypes?.map((t) => JSON.stringify(t.id)).join(" | ") ?? "string";
  const tsMethodDef = `
  type ProstglesMethod = (
    args: ${argumentType},
    ctx: {
      db: pgPromise.DB;
      dbo: DBOFullyTyped<DBGeneratedSchema>; 
      tables: any[];
      user: { id: string; type: ${userTypesTs}; };
    }
  ) => Promise<any>`;

  return { tsMethodDef };
};
