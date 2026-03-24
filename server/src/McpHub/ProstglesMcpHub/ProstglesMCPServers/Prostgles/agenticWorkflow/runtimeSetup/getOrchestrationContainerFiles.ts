import type { DBS } from "@src/index";
import { getAgenticWorkflowDockerCoreFiles } from "./getAgenticWorkflowDockerCoreFiles";
import {
  getAgenticWorkflowFiles,
  type TableSchemaOpts,
} from "./getAgenticWorkflowFiles";

export const getOrchestrationContainerFiles = async ({
  dbs,
  workflowTs,
  tableSchemaOpts,
  forDefinitions,
  connection_id,
  package_dependencies,
}: {
  dbs: DBS;
  workflowTs: string;
  tableSchemaOpts: TableSchemaOpts;
  forDefinitions: boolean;
  connection_id: string;
  package_dependencies: Record<string, string> | undefined;
}) => {
  return {
    ...(await getAgenticWorkflowFiles(
      dbs,
      "runtime",
      connection_id,
      tableSchemaOpts,
    )),
    "index.ts": workflowTs,
    ...getAgenticWorkflowDockerCoreFiles(package_dependencies, forDefinitions),
  };
};
