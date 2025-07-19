import { useMemoDeep, usePromise } from "prostgles-client/dist/prostgles";
import { useRef } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { fixIndent } from "../../../demo/sqlVideoDemo";
import { isDefined } from "../../../utils";
import type { LanguageConfig, TSLibrary } from "../../CodeEditor/CodeEditor";
import { dboLib, pgPromiseDb } from "../../CodeEditor/monacoTsLibs";
import type { MethodDefinitionProps } from "./MethodDefinition";

type Props = Pick<
  MethodDefinitionProps,
  "dbsMethods" | "connectionId" | "dbKey" | "tables" | "dbs"
> & {
  method: MethodDefinitionProps["method"] | undefined;
};

let nodeLibs: TSLibrary[] | undefined;

export const useCodeEditorTsTypes = (
  props: Props,
): LanguageConfig | undefined => {
  const { connectionId, dbsMethods, dbKey, method, tables, dbs } = props;
  const dbSchemaTypes = usePromise(async () => {
    const dbSchemaTypes = await dbsMethods.getConnectionDBTypes?.(connectionId);
    return dbSchemaTypes;
  }, [dbsMethods, connectionId]);

  /**
   * Reduce re-renders
   */
  const newMethodId = useRef("new_method_" + Date.now().toString());
  const { id, arguments: args, description: desc } = method ?? {};
  const methodOpts = useMemoDeep(() => {
    if (!method) return undefined;
    return {
      id: id ?? newMethodId,
      args,
      desc,
    };
  }, [id, args, desc]);

  const tsLibrariesAndModelName = usePromise(async () => {
    if (dbSchemaTypes && dbsMethods.getNodeTypes && connectionId && dbKey) {
      const methodTsLib =
        methodOpts &&
        (await fetchMethodDefinitionTypes({
          dbs,
          arguments: methodOpts.args ?? [],
          description: methodOpts.desc ?? "",
          tables,
        }));
      const libs = nodeLibs ?? (await dbsMethods.getNodeTypes());
      nodeLibs = libs;
      const tsLibraries: TSLibrary[] = [
        ...libs.map((l) => ({
          ...l,
          filePath: `file://${l.filePath}`,
        })),
        /** Required to ensure dbo types work */
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
        modelFileName:
          methodOpts ?
            `method_${connectionId}${methodOpts.id}`
          : `onMount_${connectionId}`,
      };
    }
  }, [dbsMethods, connectionId, dbKey, tables, dbs, dbSchemaTypes, methodOpts]);

  if (!tsLibrariesAndModelName) return;

  return {
    lang: "typescript",
    ...tsLibrariesAndModelName,
  };
};

type FetchMethodDefinitionTypesArgs = Pick<Props, "tables" | "dbs"> &
  Pick<DBSSchema["published_methods"], "arguments" | "description">;
const fetchMethodDefinitionTypes = async ({
  tables,
  arguments: args,
  description,
  dbs,
}: FetchMethodDefinitionTypesArgs) => {
  const userTypes = await dbs.user_types.find();
  const argumentTypes = args.map((a) => {
    let type: string = a.type;
    if (a.type === "Lookup" && (a.lookup as any)) {
      const refT = tables.find((t) => t.name === a.lookup.table);
      if (refT) {
        // TODO: fix type. Maybe add a LookupDefinition type?
        //@ts-ignore
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
    argumentTypes.length ? `{ \n${argumentTypes.join("")} \n}` : "never";

  const userTypesTs = userTypes.map((t) => JSON.stringify(t.id)).join(" | ");
  const tsMethodDef = fixIndent(`
    /**
     * Server-side function
     * ${description}
     */
    type ProstglesMethod = (
      args: ${argumentType},
      ctx: {
        db: pgPromise.DB;
        dbo: DBOFullyTyped<DBGeneratedSchema>; 
        tables: any[];
        user: { id: string; type: ${userTypesTs}; };
        /**
         * Call an MCP server tool
         */
        callMCPServerTool: (serverName: string, toolName: string, args?: any) => Promise<any>;
      }
    ) => Promise<any>`);

  return {
    filePath: `file:///ProstglesMethod.ts`,
    content: tsMethodDef,
  } satisfies TSLibrary;
};
