import { usePromise } from "prostgles-client/dist/prostgles";
import { isDefined } from "../../../utils";
import type { LanguageConfig, TSLibrary } from "../../CodeEditor/CodeEditor";
import { dboLib, pgPromiseDb, wsLib } from "../../CodeEditor/monacoTsLibs";
import type { MethodDefinitionProps } from "./MethodDefinition";

type Args = Pick<
  MethodDefinitionProps,
  "dbsMethods" | "connectionId" | "dbKey" | "tables" | "dbs"
> & {
  method: MethodDefinitionProps["method"] | undefined;
};
export const useCodeEditorTsTypes = (
  args: Args,
): LanguageConfig | undefined => {
  const { connectionId, dbsMethods, dbKey, method, tables, dbs } = args;
  const dbSchemaTypes = usePromise(async () => {
    const dbSchemaTypes = await dbsMethods.getConnectionDBTypes?.(connectionId);
    return dbSchemaTypes;
  }, [dbsMethods, connectionId]);

  const tsLibrariesAndModelName = usePromise(async () => {
    if (
      dbSchemaTypes &&
      dbsMethods.getAPITSDefinitions &&
      connectionId &&
      dbKey
    ) {
      const methodTsLib = await fetchMethodDefinitionTypes({
        dbs,
        method,
        tables,
      });
      const tsLibraries: TSLibrary[] = [
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
          content: `declare global {   ${dbSchemaTypes.dbSchema} }; export {}`,
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
        methodTsLib,
      ].filter(isDefined);
      return {
        tsLibraries,
        /**
         * Using the same name for onmount and method will result in all editors showing the same content (first value)
         */
        modelFileName: method ? `${method.name}` : `onMount_${connectionId}`,
      };
    }
  }, [dbsMethods, connectionId, dbKey, method, tables, dbs, dbSchemaTypes]);

  if (!tsLibrariesAndModelName) return;

  return {
    lang: "typescript",
    ...tsLibrariesAndModelName,
  };
};

const fetchMethodDefinitionTypes = async ({
  tables,
  method,
  dbs,
}: Pick<Args, "tables" | "method" | "dbs">) => {
  if (!method) return;
  const userTypes = await dbs.user_types.find();
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

  const userTypesTs = userTypes.map((t) => JSON.stringify(t.id)).join(" | ");
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

  return {
    filePath: `file:///ProstglesMethod.ts`,
    content: tsMethodDef,
  } satisfies TSLibrary;
};
