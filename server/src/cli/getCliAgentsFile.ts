import { fixIndent } from "@common/utils";
import type { SchemaConfig, SchemaConfigConnection } from "../schemaConfig";

type SchemaConfigGuidance = {
  [K in keyof SchemaConfig]: string;
};

type ConnectionGuidance = {
  [K in keyof SchemaConfigConnection]: string;
};

/**
 * This exhaustive map keeps the generated guidance in step with SchemaConfig.
 * Adding or removing a config property requires its guidance to be updated too.
 */
const schemaConfigGuidance = {
  access_control:
    "Configure database permissions with `access_control` using the Prostgles `dbPermissions` shape.",
  connection:
    "Keep non-secret connection presentation settings in `connection`; database URLs belong in `.env`.",
  databaseConfig:
    "Use `databaseConfig` for host-managed database features such as file storage and REST access.",
  functions:
    "Put privileged operations, cross-table workflows, and server-only business logic in top-level `functions`.",
  id: "Keep `id` stable because it identifies the deployed configuration.",
  joins:
    "Use `joins` only for relationships that cannot be inferred from foreign keys.",
  onInitSQL:
    "Use `onInitSQL` only for SQL initialization that cannot be expressed by `tableConfig`.",
  onMount:
    "Use `onMount` for startup integration work and return cleanup logic when resources are opened.",
  tableConfig:
    "Define tables and columns in `tableConfig`, including constraints and indexes.",
  tableConfigMigrations:
    "For schema changes that transform existing data, increment `tableConfigMigrations.version` and use `onMigrate`.",
  tableHooks: "Define `tableHooks` as a separate top-level config property.",
  watchSchemaType:
    "Set `watchSchemaType` only when schema watching must differ from the default.",
  workspaces:
    "Define typed `workspaces` as useful default dashboards that bring related data together.",
} satisfies SchemaConfigGuidance;

const connectionGuidance = {
  db_schema_filter:
    "Use `connection.db_schema_filter` only for connection-level schema visibility.",
  display_options:
    "Use `connection.display_options` for connection-wide display behavior.",
  table_options:
    "Populate `connection.table_options` for every user-facing table so data renders clearly. Add useful labels and icons, column renderers and styles, and a practical `card` layout with header, subheader, avatar, and visible columns where appropriate.",
} satisfies ConnectionGuidance;

export const getCliAgentsFile = () =>
  fixIndent(`
    # Prostgles configuration

    Build the application around the typed Prostgles schema config.

    ## Config structure

    - Import \`DBGeneratedSchema\` from \`generated/DBGeneratedSchema\`, create the typed config helper with \`const prostgles = defineConfig<DBGeneratedSchema>()\`, and default-export \`prostgles({ ... })\`. Keep the helper name \`prostgles\` so function return types can be discovered during schema generation.
    - Run \`npm run dev\` after schema or function changes. It rebuilds the config and refreshes \`generated/DBGeneratedSchema.ts\`, including \`GeneratedFunctionSchema\` for clients.
    - ${schemaConfigGuidance.id}
    - ${schemaConfigGuidance.connection} ${connectionGuidance.db_schema_filter} ${connectionGuidance.display_options}
    - ${schemaConfigGuidance.databaseConfig}
    - ${schemaConfigGuidance.access_control} 
    - ${schemaConfigGuidance.watchSchemaType}
    - ${schemaConfigGuidance.onInitSQL} ${schemaConfigGuidance.onMount}

    ## Typed database object

    - The Prostgles \`dbo\` object available in \`onMount\`, \`tableHooks\`, and server functions is \`DBOFullyTyped<DBGeneratedSchema>\`. Table names, columns, filters, selects, inserts, updates, and results are fully typed.
    - Keep the schema generic connected when moving code into separate modules. Use \`ProstglesOnMount<DBGeneratedSchema>\` for \`onMount\`, \`TableHooks<DBGeneratedSchema>\` for hooks, and the typed function definers for functions.
    - Prefer typed \`dbo\` table handlers and let TypeScript infer values. Casts should be very rare; before adding one, check the table definition, JSONB schema, generated schema, and helper generic.
    - Every table and view handler supports realtime \`subscribe\` and \`subscribeOne\`, for example \`dbo.orders.subscribe(filter, params, onData)\`. Prefer subscriptions over polling the database. Keep the returned subscription handler and call \`unsubscribe()\` during cleanup; an \`onMount\` callback can return that cleanup function.

    ## Project structure

    - Keep \`src/index.ts\` focused on composing and exporting the config.
    - Put server functions in \`src/functions/\`, table definitions in \`src/tableConfigs/\`, display metadata in \`src/tableOptions/\`, and hooks in \`src/tableHooks/\`. Add domain subfolders when a folder becomes crowded.
    - Use semantic names ending in \`*.function.ts\`, \`*.tableConfig.ts\`, \`*.tableOptions.ts\`, and \`*.tableHooks.ts\`. Examples: \`deployProject.function.ts\`, \`orders.tableConfig.ts\`, \`customers.tableOptions.ts\`, and \`users.tableHooks.ts\`.
    - The generated ESLint config enforces these suffixes inside their corresponding folders. Run \`npm run lint\` before committing.

    ## Tests

    - Run \`npm test\` before committing. Tests use \`@prostgles/prostgles/testing\` to start the real app against fresh state and project databases without opening the UI.
    - Keep deployment tests in \`tests/\`. Each call to \`createTestDeployment\` starts a disposable PostgreSQL Docker container bound only to \`127.0.0.1\`, creates fresh state and project databases, and removes the container during cleanup.
    - Add test users through the fixture's \`users\` option and connect with \`connectProjectAs(userKey)\`. Sessions are seeded directly, so deployment tests do not need to exercise the login UI.
    - Add deterministic database state with the fixture's \`seed\` callback. Never use development or production database URLs for test setup.

    ## Tables, display options, and hooks

    - ${schemaConfigGuidance.tableConfig} ${schemaConfigGuidance.tableConfigMigrations}
    - ${schemaConfigGuidance.tableHooks} Use hooks such as \`beforeEach\`, \`afterEach\`, and \`afterAll\` for application behavior instead of PostgreSQL triggers as this allows interaction with typescript and provides full type safety.
    - ${connectionGuidance.table_options} Keep each table's options in its matching \`*.tableOptions.ts\` module and merge them under \`connection.table_options\`.
    - Give every JSONB column a \`jsonbSchema\` or \`jsonbSchemaType\` so its contents are validated and typed.
    - Follow PostgreSQL schema best practices: use primary and foreign keys, appropriate nullability, unique constraints, and indexes. Model fixed sets of values as lookup tables with \`isLookupTable\` and references instead of \`CHECK (value IN (...))\` constraints.
    - ${schemaConfigGuidance.joins}

    ## Workspaces

    - ${schemaConfigGuidance.workspaces} Include tables and, where useful, aggregate SQL results, bar charts, time charts, maps, and summary statistics.
    - Keep window IDs stable and ensure every layout item references the matching window ID.

    ## File storage

    - Enable managed file storage with \`databaseConfig.file_table_config\`. For local storage, use \`{ fileTable: "files", storageType: { type: "local" } }\`. Prostgles creates and manages the file table and serves its files.
    - For S3 storage, use \`storageType: { type: "S3", credential_id }\`; configure the credential in Prostgles and never put access keys in this repository.
    - Reference \`files.id\` from application tables with foreign keys rather than storing file URLs. Referencing tables must have a primary key. Use \`referencedTables\` when file type or size restrictions are required.
    - Use \`delayedDelete\` when files should remain recoverable for a retention period. Enable \`extractText\` and provide an \`annotationsTable\` only when document extraction or annotations are needed.
    - Local file data lives outside PostgreSQL. Use persistent storage and include it in deployment backups.

    ## Server-side functions

    - ${schemaConfigGuidance.functions}
    - Organize \`functions\` into groups shaped as \`{ userFilter, functions }\`. The group filter controls which authenticated users receive those functions.
    - Create a schema-aware group helper with \`createFunctionGroupDefiner<DBGeneratedSchema>()\`. For function maps kept in separate modules, use \`createFunctionsDefiner<DBGeneratedSchema>()\` so names, database context, inputs, and return types remain inferred across imports.
    - Define individual functions with \`defineFunction({ input, description, run })\`. Inputs use Prostgles JSONB field definitions and are validated before \`run\` executes.
    - Functions have restricted database access by default. Set \`unrestrictedDbAccess: true\` only when the function needs raw SQL, transactions, or client DB-handler generation.
    - Keep secrets on the server and use database transactions for multi-step writes.`);
