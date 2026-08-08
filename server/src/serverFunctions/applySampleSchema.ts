import fs from "fs";
import path from "path";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBS } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import { isDefined } from "@common/filterUtils";
import type { SampleSchema, SampleSchemaDir } from "@common/utils";
import { getEvaledExports } from "../ConnectionManager/connectionManagerUtils";
import { actualRootDir } from "../electronConfig";
import { runConnectionQuery } from "./getServerFunctions";
import { syncSchemaConfig } from "../ConnectionManager/syncSchemaConfig";

export const applySampleSchema = async (
  dbs: DBS,
  sampleSchemaName: string,
  connId: string,
) => {
  const schema = getSampleSchemas().find((s) => s.name === sampleSchemaName);
  if (!schema) {
    throw "Sample schema not found: " + sampleSchemaName;
  }
  if (schema.type === "sql") {
    await runConnectionQuery(connId, schema.file, undefined, { dbs });
    return;
  }

  await applySchemaDir(dbs, schema, connId);
};

export const applySchemaDir = async (
  dbs: DBS,
  schema: SampleSchemaDir & { name: string; path: string },
  connectionId: string,
) => {
  await syncSchemaConfig({
    dbs,
    connectionId,
    configPath: path.join(schema.path, schema.name),
    type: "sample-schema",
  });
};

const getFileIfExists = (path: string) => {
  if (!fs.existsSync(path)) {
    return undefined;
  }
  return fs.readFileSync(path, "utf8");
};

export const getSampleSchemas = (): SampleSchema[] => {
  const sampleSchemasDir = path.join(actualRootDir, `/sample_schemas`);
  const files = fs
    .readdirSync(sampleSchemasDir)
    .filter((name) => !name.startsWith("_"));
  return files
    .map((name) => {
      const configPath = `${sampleSchemasDir}/${name}`;
      return {
        path: sampleSchemasDir,
        name,
        ...getSampleSchema(configPath),
      };
    })
    .filter(isDefined);
};

export const getSampleSchema = (configPath: string) => {
  if (fs.statSync(`${configPath}`).isDirectory()) {
    return {
      // path: sampleSchemasDir,
      // name,
      type: "dir" as const,
      tableConfigTs: getFileIfExists(`${configPath}/tableConfig.ts`) ?? "",
      onMountTs: getFileIfExists(`${configPath}/onMount.ts`) ?? "",
      onInitSQL: getFileIfExists(`${configPath}/onInit.sql`) ?? "",
      connection: getEvaledExports<{
        default: SampleSchemaDir["connection"];
      }>(getFileIfExists(`${configPath}/connection.ts`))?.default,
      databaseConfig: getEvaledExports<{
        default: SampleSchemaDir["databaseConfig"];
      }>(getFileIfExists(`${configPath}/databaseConfig.ts`) ?? "")?.default,
      workspaceConfig: getEvaledExports<SampleSchemaDir>(
        getFileIfExists(`${configPath}/workspaceConfig.ts`),
      )?.workspaceConfig,
    };
  }
  return {
    // name,
    // path: sampleSchemasDir,
    type: "sql" as const,
    file: getFileIfExists(configPath) ?? "",
  };
};
