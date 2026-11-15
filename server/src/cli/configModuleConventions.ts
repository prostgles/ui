import type { ServerFunctionDefinition, SessionUser } from "prostgles-server";
import type { ProstglesService, ServiceRegistry } from "../services";
import type {
  SchemaConfig,
  SchemaConfigAccessControl,
  TableDisplayConfig,
} from "../schemaConfig";

export const configModuleConventions: readonly {
  folder: string;
  type: keyof ConfigModuleTypes<never, never>;
  aggregateName: string | undefined;
  legacySuffix: string | undefined;
}[] = [
  {
    folder: "accessControl",
    type: "accessControl",
    aggregateName: undefined,
    legacySuffix: undefined,
  },
  {
    folder: "functions",
    type: "function",
    aggregateName: undefined,
    legacySuffix: undefined,
  },
  {
    folder: "functions",
    type: "functions",
    aggregateName: undefined,
    legacySuffix: undefined,
  },
  {
    folder: "functions",
    type: "functionGroup",
    aggregateName: undefined,
    legacySuffix: undefined,
  },
  {
    folder: "jobs",
    type: "job",
    aggregateName: "jobs",
    legacySuffix: undefined,
  },
  {
    folder: "tables",
    type: "tableConfig",
    aggregateName: "tableConfig",
    legacySuffix: undefined,
  },
  {
    folder: "tables",
    type: "tableOptions",
    aggregateName: "tableOptions",
    legacySuffix: "tableOption",
  },
  {
    folder: "tables",
    type: "tableHooks",
    aggregateName: "tableHooks",
    legacySuffix: "tableHook",
  },
  {
    folder: "services",
    type: "service",
    aggregateName: undefined,
    legacySuffix: undefined,
  },
];

export type ConfigModuleTypes<Schema, Services extends ServiceRegistry> = {
  tableConfig: NonNullable<SchemaConfig<Schema>["tableConfig"]>;
  tableOptions: TableDisplayConfig;
  tableHooks: NonNullable<
    SchemaConfig<Schema, SessionUser, Services>["tableHooks"]
  >;
  job: NonNullable<
    SchemaConfig<Schema, SessionUser, Services>["jobs"]
  >["definitions"];
  accessControl: SchemaConfigAccessControl[];
  functionGroup: NonNullable<
    SchemaConfig<Schema, SessionUser, Services>["functions"]
  >[string];
  functions: ConfigModuleTypes<Schema, Services>["functionGroup"]["functions"];
  function: ServerFunctionDefinition;
  service: ProstglesService;
};
