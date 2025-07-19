import fs from "fs";
import path from "path";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DBS } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import { isDefined } from "../../../commonTypes/filterUtils";
import type { SampleSchema, SampleSchemaDir } from "../../../commonTypes/utils";
import { getEvaledExports } from "../ConnectionManager/connectionManagerUtils";
import { actualRootDir } from "../electronConfig";
import { runConnectionQuery } from "./publishMethods";

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

  const { tableConfigTs, onMountTs, onInitSQL, connection, databaseConfig } =
    schema;
  if (onInitSQL) {
    await runConnectionQuery(connId, onInitSQL, undefined, { dbs });
  }
  await dbs.database_configs.update(
    { $existsJoined: { connections: { id: connId } } },
    { table_config_ts: tableConfigTs, ...databaseConfig },
  );
  await dbs.connections.update(
    { id: connId },
    { on_mount_ts: onMountTs, ...connection },
  );
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
      const schemaPath = `${sampleSchemasDir}/${name}`;
      if (fs.statSync(`${schemaPath}`).isDirectory()) {
        return {
          path: sampleSchemasDir,
          name,
          type: "dir" as const,
          tableConfigTs: getFileIfExists(`${schemaPath}/tableConfig.ts`) ?? "",
          onMountTs: getFileIfExists(`${schemaPath}/onMount.ts`) ?? "",
          onInitSQL: getFileIfExists(`${schemaPath}/onInit.sql`) ?? "",
          connection: getEvaledExports<{
            default: SampleSchemaDir["connection"];
          }>(getFileIfExists(`${schemaPath}/connection.ts`))?.default,
          databaseConfig: getEvaledExports<{
            default: SampleSchemaDir["databaseConfig"];
          }>(getFileIfExists(`${schemaPath}/databaseConfig.ts`) ?? "")?.default,
          workspaceConfig: getEvaledExports<SampleSchemaDir>(
            getFileIfExists(`${schemaPath}/workspaceConfig.ts`),
          )?.workspaceConfig,
        } satisfies SampleSchema;
      }
      return {
        name,
        path: sampleSchemasDir,
        type: "sql" as const,
        file: getFileIfExists(schemaPath) ?? "",
      };
    })
    .filter(isDefined);
};
