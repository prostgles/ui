import type { DBS } from "@src/index";
import { getSchemaConfig } from "@src/ConnectionManager/getSchemaConfig";
import type { DBSSchema } from "@common/publishUtils";
import type { FilterItem } from "prostgles-types";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAgenticWorkflow } from "./createAgenticWorkflow";
import { getAgenticWorkflowFiles } from "./runtimeSetup/getDefineAgenticWorkflowTsWithDbAndMcpTypes";
import { getWorkflowDeclaration } from "./runtimeSetup/getWorkflowDeclaration";
import {
  WORKFLOW_SDK_FILE_NAME,
  WORKFLOW_TYPES_FILE_NAME,
} from "./runtimeSdk/workflowConstants";
import { generatedFolderName } from "@src/cli/cliTemplateFiles";
import { logTimedStep } from "@src/utils/logTimedStep";

export type WorkflowConfig = {
  /** TypeScript entrypoint, relative to the config project. Imports defineAgenticWorkflow from #prostgles/workflow and calls it at the top level. */
  source: string;
  packageDependencies?: Record<string, string>;
};

export const getConfiguredWorkflowSource = async (
  dbs: DBS,
  connectionId: string,
  name: string,
) => {
  const databaseConfig = await dbs.database_configs.findOne({
    $existsJoined: { connections: { id: connectionId } },
  });
  const loaded = getSchemaConfig(databaseConfig?.config_sync);
  const config = loaded?.config.workflows?.[name];
  if (!loaded || !config) throw new Error(`Workflow ${name} is not registered`);
  const projectPath = await realpath(loaded.configPath);
  const sourcePath = await realpath(path.resolve(projectPath, config.source));
  const relativePath = path.relative(projectPath, sourcePath);
  if (
    relativePath.startsWith(".." + path.sep) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Workflow source must be inside the config project");
  }
  return { config, sourcePath, definition: await readFile(sourcePath, "utf8") };
};

export const getConfiguredWorkflow = async (
  dbs: DBS,
  connectionId: string,
  userId: string,
  name: string,
) => {
  const { config, definition } = await getConfiguredWorkflowSource(
    dbs,
    connectionId,
    name,
  );
  const filter = {
    connection_id: connectionId,
    source_key: name,
  };
  const existing = await dbs.agentic_workflows.findOne(filter);
  if (
    existing?.definition === definition &&
    JSON.stringify(existing.package_dependencies ?? {}) ===
      JSON.stringify(config.packageDependencies ?? {})
  ) {
    return existing;
  }
  const ownerId = existing?.user_id ?? userId;
  const finishWorkflowValidation = logTimedStep(
    `Validating workflow "${name}" in Docker`,
  );
  const result = await createAgenticWorkflow(
    {
      workflow_function_definition: definition,
      workflow_function_definition_summary: name,
      workflowId: existing?.id,
      package_dependencies: config.packageDependencies,
    },
    { dbs, user_id: ownerId, connection_id: connectionId },
  );
  if (!result.isValid)
    throw new Error(result.logs || JSON.stringify(result.error));
  const workflow = await dbs.agentic_workflows.update(
    { id: result.workflowId, user_id: ownerId },
    { source_key: name, saved: true, definition_override: null },
    { returning: "*", multi: false },
  );
  if (!workflow) throw new Error("Workflow was not registered");
  finishWorkflowValidation();
  return workflow;
};

export const getAgenticWorkflowAccessFilter = (
  userId: string,
  isAdmin: boolean,
): { $or: FilterItem<DBSSchema["agentic_workflows"]>[] } => ({
  $or: [
    { user_id: userId },
    ...(isAdmin ? [{ source_key: { "<>": null } }] : []),
  ],
});

/** Refresh editor declarations without importing executable workflow code into the host. */
export const writeWorkflowTypes = async (
  dbs: DBS,
  connectionId: string,
  workflows: Record<string, WorkflowConfig>,
  configPath: string,
) => {
  if (!Object.keys(workflows).length) return;
  const files = await getAgenticWorkflowFiles(dbs, "runtime", connectionId, {
    type: "full",
    ddlStatements: undefined,
  });
  const definition = getWorkflowDeclaration(files[WORKFLOW_SDK_FILE_NAME]);
  const directory = path.join(configPath, generatedFolderName);
  const declarationPath = path.join(directory, WORKFLOW_TYPES_FILE_NAME);
  if (
    (await readFile(declarationPath, "utf8").catch(() => undefined)) !==
    definition
  ) {
    await mkdir(directory, { recursive: true });
    await writeFile(declarationPath, definition);
  }
};
