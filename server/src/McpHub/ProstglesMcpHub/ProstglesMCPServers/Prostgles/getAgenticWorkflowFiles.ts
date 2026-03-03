import { readFileSync } from "fs";
import { join } from "path";
import {
  END_OF_SCHEMA_PLACEHOLDER,
  replaceMcpServerToolDefinitions,
} from "./defineAgenticWorkflow";
import type { DBS } from "@src/index";
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
  "src",
  "McpHub",
  "ProstglesMcpHub",
  "ProstglesMCPServers",
  "Prostgles",
);
const defineAgenticWorkflowTs = readFileSync(
  join(defineAgenticWorkflowDirectory, "defineAgenticWorkflow.ts"),
  "utf8",
);
const defineAgenticWorkflowHandlersTs = readFileSync(
  join(defineAgenticWorkflowDirectory, "defineAgenticWorkflowHandlers.ts"),
  "utf8",
);
const defineAgenticWorkflowTsSchema = defineAgenticWorkflowTs.split(
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
) => {
  const mcpServerToolDefinitions = await getToolTypescriptSchemas(
    dbs,
    undefined,
  );

  const result = replaceMcpServerToolDefinitions({
    defineAgenticWorkflowTs:
      purpose === "agent" ?
        defineAgenticWorkflowTsSchema
      : defineAgenticWorkflowTs,
    mcpServerToolDefinitions,
  });
  return result;
};

export const getAgenticWorkflowFiles = async (
  dbs: DBS,
  purpose: "runtime" | "agent",
) => {
  const defineAgenticWorkflowTsWithSchemas =
    await getDefineAgenticWorkflowTsSchema(dbs, purpose);
  return {
    "defineAgenticWorkflow.ts": defineAgenticWorkflowTsWithSchemas,
    "defineAgenticWorkflowHandlers.ts": defineAgenticWorkflowHandlersTs,
  };
};
