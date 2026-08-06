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
import type { DBSSchemaForInsert } from "@common/publishUtils";

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
  schema: SampleSchemaDir,
  connectionId: string,
  databaseConfigOverride?: Partial<DBSSchemaForInsert["database_configs"]>,
) => {
  const { tableConfigTs, onMountTs, onInitSQL, connection, databaseConfig } =
    schema;
  if (onInitSQL) {
    await runConnectionQuery(connectionId, onInitSQL, undefined, { dbs });
  }
  await dbs.database_configs.update(
    { $existsJoined: { connections: { id: connectionId } } },
    {
      table_config_ts: tableConfigTs,
      ...databaseConfig,
      ...databaseConfigOverride,
    },
  );
  await dbs.connections.update(
    { id: connectionId },
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
      return {
        path: sampleSchemasDir,
        name,
        ...getSampleSchema(schemaPath),
      };
    })
    .filter(isDefined);
};

export const getSampleSchema = (schemaPath: string) => {
  if (fs.statSync(`${schemaPath}`).isDirectory()) {
    return {
      // path: sampleSchemasDir,
      // name,
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
    };
  }
  return {
    // name,
    // path: sampleSchemasDir,
    type: "sql" as const,
    file: getFileIfExists(schemaPath) ?? "",
  };
};
