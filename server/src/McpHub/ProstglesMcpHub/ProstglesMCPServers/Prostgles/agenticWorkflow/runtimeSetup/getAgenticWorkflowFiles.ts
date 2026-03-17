import { connectionManager, type DBS } from "@src/index";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { isDefined } from "prostgles-types";
import { END_OF_SCHEMA_PLACEHOLDER } from "../runtimeSdk/defineAgenticWorkflow";
import { getDefineAgenticWorkflowWithSchemas } from "./getDefineAgenticWorkflowWithSchemas";
import { getToolTypescriptSchemas } from "./getToolTypescriptSchemas";

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

export type TableSchemaOpts =
  | {
      type: "full";
      ddlStatements: string | undefined;
    }
  | { type: "generic" };
export const getAgenticWorkflowFiles = async (
  dbs: DBS,
  purpose: "runtime" | "agent",
  connection_id: string,
  tableSchemaOpts: TableSchemaOpts,
) => {
  const { prgl } = connectionManager.getActiveConnection(connection_id);

  let dbSchema = `
    export type DBGeneratedSchema = Record<string, { columns: Record<string, any> }>;
  `;
  if (tableSchemaOpts.type === "full") {
    const futureSchema = await prgl.getTSSchema({
      excludeFunctions: true,
      ddlWithRollback: tableSchemaOpts.ddlStatements,
    });
    dbSchema = futureSchema.tsSchema;
  }
  const defineAgenticWorkflowTsWithSchemas =
    await getDefineAgenticWorkflowTsSchema(dbs, purpose, dbSchema);
  return {
    ...Object.fromEntries(allFilesInDirectory),
    "defineAgenticWorkflow.ts": defineAgenticWorkflowTsWithSchemas,
    "defineAgenticWorkflowHandlers.ts": defineAgenticWorkflowHandlersTs,
  };
};
