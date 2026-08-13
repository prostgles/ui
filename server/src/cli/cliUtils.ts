import { fixIndent } from "@common/utils";
import packageJson from "../../package.json";

export const srcFolderName = "src";
export const generatedFolderName = "generated";

export const cliTemplateFiles = {
  package: {
    private: true,
    version: "0.0.0",
    main: "build/src/index.js",
    scripts: {
      build: "tsc --project tsconfig.json",
      dev: "prostgles dev --config .",
      start: "prostgles start --config .",
    },
    dependencies: { "@prostgles/prostgles": `^${packageJson.version}` },
    devDependencies: {
      "@types/node": "^22.20.1",
      typescript: packageJson.dependencies["typescript"],
    },
    exports: {
      "./generated": {
        types: "./build/generated/index.d.ts",
        default: "./build/generated/index.js",
      },
    },
  },
  tsconfig: {
    compilerOptions: {
      target: "ES2022",
      module: "Node16",
      moduleResolution: "Node16",
      rootDir: ".",
      outDir: "build",
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
    },
    include: [srcFolderName, generatedFolderName],
  },
  DBGeneratedSchema:
    "export type DBGeneratedSchema = Record<string, { columns: Record<string, unknown> }>\n",
  agents: fixIndent(`
      # Prostgles configuration

      Build the application around these core Prostgles features:

      ## Table configuration

      - Define tables and columns in \`tableConfig\`. Prostgles applies schema changes automatically. For changes that require existing data to be transformed, increment \`tableConfigMigrations.version\` and use \`onMigrate\`.
      - Use TypeScript table \`hooks\` such as \`beforeEach\`, \`afterEach\`, and \`afterAll\` for application behavior instead of PostgreSQL triggers.
      - Give every JSONB column a \`jsonbSchema\` or \`jsonbSchemaType\` so its contents are validated and typed.
      - Follow PostgreSQL schema best practices: use primary and foreign keys, appropriate nullability, unique constraints, and indexes. Model fixed sets of values as lookup tables with \`isLookupTable\` and references instead of \`CHECK (value IN (...))\` constraints.

      ## Workspaces

      - Define typed \`workspaces\` as useful default dashboards that bring related data together. Include tables and, where useful, aggregate SQL results, bar charts, time charts, maps, and summary statistics.
      - Keep window IDs stable and ensure every layout item references the matching window ID.

      ## File storage

      - Enable managed file storage with \`databaseConfig.file_table_config\`. For local storage, use \`{ fileTable: "files", storageType: { type: "local" } }\`. Prostgles creates and manages the file table and serves its files.
      - For S3 storage, use \`storageType: { type: "S3", credential_id }\`; configure the credential in Prostgles and never put access keys in this repository.
      - Reference \`files.id\` from application tables with foreign keys rather than storing file URLs. Referencing tables must have a primary key. Use \`referencedTables\` when file type or size restrictions are required.
      - Use \`delayedDelete\` when files should remain recoverable for a retention period. Enable \`extractText\` and provide an \`annotationsTable\` only when document extraction or annotations are needed.
      - Local file data lives outside PostgreSQL. Use persistent storage and include it in deployment backups.

      ## Server-side functions

      - Put privileged operations, cross-table workflows, and server-only business logic in \`functions\`.
      - Define and validate function inputs, include a clear description, authorize from the current user context, and expose \`run\` only to users allowed to call it.
      - Keep secrets on the server and use database transactions for multi-step writes.`),
  gitignore: fixIndent(`
      node_modules/
      build/
      .env
      *.log`),
  envExample: fixIndent(`
      # Prostgles UI state database. This stores users, settings, and connections.
      # POSTGRES_URL=postgres://user:password@localhost:5432/prostgles_state

      # Database exposed by this config.
      # PROSTGLES_DATABASE_URL=postgres://user:password@localhost:5432/application`),
} as const;
