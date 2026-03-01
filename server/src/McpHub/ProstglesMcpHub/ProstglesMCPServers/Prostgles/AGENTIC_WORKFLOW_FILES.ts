import { readFileSync } from "fs";
import { join } from "path";
import { END_OF_SCHEMA_PLACEHOLDER } from "./defineAgenticWorkflow";

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
export const defineAgenticWorkflowTs = readFileSync(
  join(defineAgenticWorkflowDirectory, "defineAgenticWorkflow.ts"),
  "utf8",
);
export const defineAgenticWorkflowHandlersTs = readFileSync(
  join(defineAgenticWorkflowDirectory, "defineAgenticWorkflowHandlers.ts"),
  "utf8",
);
export const defineAgenticWorkflowTsSchema = defineAgenticWorkflowTs.split(
  END_OF_SCHEMA_PLACEHOLDER,
)[0];

if (
  !defineAgenticWorkflowTs ||
  !defineAgenticWorkflowTsSchema ||
  !defineAgenticWorkflowHandlersTs
) {
  throw new Error("Failed to read defineAgenticWorkflow.ts");
}

export const AGENTIC_WORKFLOW_FILES = {
  "defineAgenticWorkflow.ts": defineAgenticWorkflowTs,
  "defineAgenticWorkflowHandlers.ts": defineAgenticWorkflowHandlersTs,
};
