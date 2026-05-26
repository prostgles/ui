import type { DBS } from "@src/index";
import { getToolTypescriptSchemas } from "./getToolTypescriptSchemas";
import { END_OF_SCHEMA_PLACEHOLDER } from "../runtimeSdk/defineAgenticWorkflow";
import { readdirSync, readFileSync } from "fs";
import { isDefined } from "prostgles-types";
import { join } from "path";
import { connectionManager } from "@src/index";
import { statePrgl } from "@src/init/startProstgles";

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

export const allFilesInDirectory = new Map(
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
export const defineAgenticWorkflowHandlersTs = allFilesInDirectory.get(
  "defineAgenticWorkflowHandlers.ts",
);

const defineAgenticWorkflowTsWithoutHandlers = defineAgenticWorkflowTs?.split(
  END_OF_SCHEMA_PLACEHOLDER,
)[0];

if (
  !defineAgenticWorkflowTs ||
  !defineAgenticWorkflowTsWithoutHandlers ||
  !defineAgenticWorkflowHandlersTs
) {
  throw new Error("Failed to read defineAgenticWorkflow.ts");
}

export const getDefineAgenticWorkflowTsWithDbAndMcpTypes = async ({
  dbs,
  purpose,
  dbGeneratedSchema,
}: {
  dbs: DBS;
  purpose: "runtime" | "agent-prompt";
  dbGeneratedSchema: string | undefined;
}) => {
  const defineAgenticWorkflowTsContent =
    purpose === "agent-prompt" ?
      defineAgenticWorkflowTsWithoutHandlers
    : defineAgenticWorkflowTs;
  const mcpServerToolDefinitions =
    purpose === "agent-prompt" ? undefined : (
      await getToolTypescriptSchemas(dbs, "*", "compact")
    );

  const startOfReplace = defineAgenticWorkflowTsContent.indexOf(
    "type McpServerToolDefinitions = ",
  );
  const endOfReplace = defineAgenticWorkflowTsContent.lastIndexOf(
    "//EndOfReplaceMcpServerToolDefinitions;",
  );
  if (
    startOfReplace === -1 ||
    endOfReplace === -1 ||
    endOfReplace < startOfReplace
  ) {
    throw new Error(
      "Could not find placeholder for McpServerToolDefinitions in defineAgenticWorkflow.ts",
    );
  }

  if (!mcpServerToolDefinitions) {
    return (
      defineAgenticWorkflowTs.slice(
        0,
        defineAgenticWorkflowTs.indexOf("// type McpServerToolDefinitions ="),
      ) + defineAgenticWorkflowTs.slice(endOfReplace)
    );
  }

  const McpTypes = [
    "type McpServerToolDefinitions = {",
    ...Object.entries(mcpServerToolDefinitions).map(([serverName, tool]) => {
      return [
        `  ${JSON.stringify(serverName)}: {`,
        ...Object.entries(tool).map(
          ([_toolName, { tsDefinition }]) => ` ${tsDefinition}`,
        ),
        "}",
      ].join("\n");
    }),
    "}",
  ].join("\n");

  const result =
    defineAgenticWorkflowTs.slice(0, startOfReplace) +
    McpTypes +
    defineAgenticWorkflowTs.slice(endOfReplace);

  const startOfDbSchemaReplace = result.lastIndexOf(
    "export type DBGeneratedSchema =",
  );
  const endOfDbSchemaReplace = result.lastIndexOf("//EndOfDBGeneratedSchema;");
  if (
    startOfDbSchemaReplace === -1 ||
    endOfDbSchemaReplace === -1 ||
    endOfDbSchemaReplace < startOfDbSchemaReplace
  ) {
    throw new Error(
      "Could not find placeholder for DBGeneratedSchema in defineAgenticWorkflow.ts",
    );
  }
  const DEFAULT_DB_GENERATED_SCHEMA = `
  export type DBGeneratedSchema = Record<string, { columns: Record<string, any> }>;
`;
  const dbSchema = dbGeneratedSchema || DEFAULT_DB_GENERATED_SCHEMA;
  return (
    result.slice(0, startOfDbSchemaReplace) +
    dbSchema +
    result.slice(endOfDbSchemaReplace)
  );
};

export type TableSchemaOpts =
  | {
      type: "full";
      ddlStatements: string | undefined;
    }
  | { type: "generic" };

export const getAgenticWorkflowFiles = async (
  dbs: DBS,
  purpose: "runtime" | "agent-prompt",
  connection_id: string,
  tableSchemaOpts: TableSchemaOpts,
) => {
  const stateDb = connectionManager.connections?.find(
    (c) => c.id === connection_id && c.is_state_db,
  );
  const prgl =
    stateDb ?
      statePrgl!
    : connectionManager.getActiveConnection(connection_id).prgl;
  let dbSchema = undefined as undefined | string;
  if (tableSchemaOpts.type === "full") {
    const futureSchema = await prgl.getTSSchema({
      excludeFunctions: true,
      ddlWithRollback: tableSchemaOpts.ddlStatements,
    });
    dbSchema = futureSchema.tsSchema;
  }
  const defineAgenticWorkflowTsWithSchemas =
    await getDefineAgenticWorkflowTsWithDbAndMcpTypes({
      dbs,
      purpose,
      dbGeneratedSchema: dbSchema,
    });
  return {
    ...Object.fromEntries(allFilesInDirectory),
    "defineAgenticWorkflow.ts": defineAgenticWorkflowTsWithSchemas,
    "defineAgenticWorkflowHandlers.ts": defineAgenticWorkflowHandlersTs,
  };
};
