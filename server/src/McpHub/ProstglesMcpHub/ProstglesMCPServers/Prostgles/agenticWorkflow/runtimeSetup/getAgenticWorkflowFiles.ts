import type { DBSSchema } from "@common/publishUtils";
import { connectionManager, type DBS } from "@src/index";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { TableSchema } from "prostgles-server/dist/DboBuilder/DboBuilder";
import { getProperty, isDefined } from "prostgles-types";
import { END_OF_SCHEMA_PLACEHOLDER } from "../runtimeSdk/defineAgenticWorkflow";
import { getToolTypescriptSchemas } from "./getToolTypescriptSchemas";
import { getDefineAgenticWorkflowWithSchemas } from "./getDefineAgenticWorkflowWithSchemas";
import {
  renderSummary,
  summariseWorkflowFile,
} from "../runtimeSdk/getTsLogicSummary";
import {
  consoleStepLogger,
  instrumentWorkflowFile,
} from "../runtimeSdk/addInstrumentationToTsLogic";

const defineAgenticWorkflowDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "src",
  "McpHub",
  "ProstglesMcpHub",
  "ProstglesMCPServers",
  "Prostgles",
  "agenticWorkflow",
  "runtimeSdk",
);

const allFilesInDirectory = new Map(
  readdirSync(defineAgenticWorkflowDirectory)
    .map((fileName) =>
      fileName.endsWith(".spec.ts") ? undefined : (
        ([
          fileName,
          readFileSync(join(defineAgenticWorkflowDirectory, fileName), "utf8"),
        ] as const)
      ),
    )
    .filter(isDefined),
);

const defineAgenticWorkflowTs = allFilesInDirectory.get(
  "defineAgenticWorkflow.ts",
);
const defineAgenticWorkflowHandlersTs = allFilesInDirectory.get(
  "defineAgenticWorkflowHandlers.ts",
);

const defineAgenticWorkflowTsSchema = defineAgenticWorkflowTs?.split(
  END_OF_SCHEMA_PLACEHOLDER,
)[0];

if (
  !defineAgenticWorkflowTs ||
  !defineAgenticWorkflowTsSchema ||
  !defineAgenticWorkflowHandlersTs
) {
  throw new Error("Failed to read defineAgenticWorkflow.ts");
}

export const getDefineAgenticWorkflowTsSchema = async (
  dbs: DBS,
  purpose: "runtime" | "agent",
  dbGeneratedSchema: string,
) => {
  const mcpServerToolDefinitions = await getToolTypescriptSchemas(
    dbs,
    "*",
    "compact",
  );

  const result = getDefineAgenticWorkflowWithSchemas({
    defineAgenticWorkflowTs:
      purpose === "agent" ?
        defineAgenticWorkflowTsSchema
      : defineAgenticWorkflowTs,
    mcpServerToolDefinitions:
      purpose === "agent" ? undefined : mcpServerToolDefinitions,
    dbGeneratedSchema,
  });
  return result;
};

export const getAgenticWorkflowFiles = async (
  dbs: DBS,
  purpose: "runtime" | "agent",
  connection_id: string,
  tableSchemaOpts:
    | {
        type: "full";
        newTables: DBSSchema["agentic_workflows"]["definition_data"]["newTables"];
      }
    | { type: "generic" },
) => {
  const { prgl } = connectionManager.getActiveConnection(connection_id);

  let dbSchema = `
    export type DBGeneratedSchema = Record<string, { columns: Record<string, any> }>;
  `;
  if (tableSchemaOpts.type === "full") {
    const newTables = tableSchemaOpts.newTables ?? [];
    dbSchema = prgl.getTSSchema({
      excludeFunctions: true,
      extraTables: newTables.map((t) => {
        return {
          oid: -1,
          view_definition: null,
          view_related_tables: undefined,
          parent_tables: [],
          privileges: {
            delete: true,
            insert: true,
            select: true,
            update: true,
          },

          name: t.name,
          is_view: false,
          comment: "",
          schema: t.schema || "public",
          escaped_identifier: t.name,
          columns: t.columns.map((c, idx) => {
            return {
              is_nullable: c.nullable ?? true,
              is_updatable: true,
              is_generated: false,
              element_type: undefined,
              element_udt_name: undefined,
              is_pkey: false,
              has_default: false,
              privileges: {
                INSERT: true,
                REFERENCES: true,
                SELECT: true,
                UPDATE: true,
              },
              ordinal_position: idx + 1,
              name: c.name,
              label: c.name,
              comment: "",
              udt_name:
                getProperty(dataTypeToUdtNameMap, c.dataType) ??
                (c.dataType as any),
              data_type: c.dataType,
            } satisfies TableSchema["columns"][number];
          }),
        };
      }),
    });
  }
  const defineAgenticWorkflowTsWithSchemas =
    await getDefineAgenticWorkflowTsSchema(dbs, purpose, dbSchema);
  return {
    ...Object.fromEntries(allFilesInDirectory),
    "defineAgenticWorkflow.ts": defineAgenticWorkflowTsWithSchemas,
    "defineAgenticWorkflowHandlers.ts": defineAgenticWorkflowHandlersTs,
  };
};

const dataTypeToUdtNameMap = {
  ARRAY: "any",
  serial: "integer",
  text: "text",
  integer: "integer",
  boolean: "boolean",
} as const;

console.error("FINISH OR REMOVE");
// const exampleSlice = defineAgenticWorkflowTs.slice(
//   defineAgenticWorkflowTs.lastIndexOf("* \n") + 3,
//   defineAgenticWorkflowTs.lastIndexOf(`*/`),
// );
// const nodes = summariseWorkflowFile(exampleSlice);
// console.log(nodes, renderSummary(nodes), instrumentWorkflowFile(exampleSlice));
