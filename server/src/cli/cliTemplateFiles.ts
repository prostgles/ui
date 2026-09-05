import { fixIndent } from "@common/utils";
import { randomBytes } from "crypto";
import type { SchemaConfig, SchemaConfigConnection } from "../schemaConfig";
import packageJson from "../../package.json";
import { fromEntries, pickKeys } from "prostgles-types";
import { dirname, join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

export const saveCliTemplateFiles = ({
  configId,
  targetPath,
  environmentDefaults,
}: {
  configId: string;
  targetPath: string;
  environmentDefaults?: {
    PRGL_PASSWORD?: string;
    PROSTGLES_DOCKER_DB_PASSWORD?: string;
  };
}) => {
  saveFolderFiles(
    targetPath,
    getCliTemplateFiles({ configId, environmentDefaults }),
  );
};

export const saveCliComposeFiles = ({
  configId,
  targetPath,
}: {
  configId: string;
  targetPath: string;
}) => {
  const files = getCliComposeFiles({ configId });
  const existingFiles = Object.keys(files).filter((fileName) =>
    existsSync(join(targetPath, fileName)),
  );
  if (existingFiles.length) {
    throw new Error(
      `Refusing to overwrite existing deployment files: ${existingFiles.join(", ")}`,
    );
  }
  saveFolderFiles(targetPath, files);
};

export const srcFolderName = "src";
export const generatedFolderName = "generated";
const testsFolderName = "tests";

const servicesFolderName = "services";
export const srcSubfolderNames = [
  "functions",
  "tableConfigs",
  "tableOptions",
  "tableHooks",
  servicesFolderName,
] as const;

type FolderFiles = {
  [key: string]: string | FolderFiles;
};

const saveFolderFiles = (targetPath: string, folderFiles: FolderFiles) => {
  for (const [relativePath, content] of Object.entries(folderFiles)) {
    const fullPath = join(targetPath, relativePath);
    const fullPathDirectory = dirname(fullPath);
    if (typeof content === "string") {
      mkdirSync(fullPathDirectory, { recursive: true });
      writeFileSync(fullPath, fixIndent(content));
    } else {
      mkdirSync(fullPath, { recursive: true });
      saveFolderFiles(fullPath, content);
    }
  }
};

const getCliTemplateFiles = ({
  configId,
  environmentDefaults,
}: {
  configId: string;
  environmentDefaults?: {
    PRGL_PASSWORD?: string;
    PROSTGLES_DOCKER_DB_PASSWORD?: string;
  };
}) =>
  ({
    ...getCliComposeFiles({ configId }),
    "README.md": `
      # ${configId}

      ## Development

      Copy \`.env.example\` to \`.env\`, configure both database URLs, then run:

      \`\`\`sh
      npm install
      npm run dev
      \`\`\`

      ## Upgrading

      Run \`npm run upgrade\` to compare this app with the installed Prostgles version's scaffold.
      Update the Prostgles dependency first when upgrading to a newer version.
      Each new file prompts for skip/write (default: write). Each differing file prompts for
      skip/merge/overwrite (default: merge). Identical files are left alone.
      Enter the first letter of an action, or press Enter to use the default.
      Merge opens each changed section with inline Accept Current/Incoming/Both actions in VS Code.
      The \`git\` and \`code\` commands must be on PATH; no Git repository is required.
      There is no historical template baseline, so merge is a manual comparison of both versions.
      Save the result and close the file to continue to the next file.
      Changes are applied as you go.

      ## Deployment

      Set strong \`PRGL_PASSWORD\` and \`PROSTGLES_DOCKER_DB_PASSWORD\` values in \`.env\`, then use Docker Compose directly:

      \`\`\`sh
      docker compose up -d --build
      docker compose logs -f app
      docker compose down
      \`\`\`

      The database and Prostgles data directory use named volumes. Managed app services share the private runtime network and are not published on host ports.`,
    "package.json": JSON.stringify(getPackageJson(configId), null, 2) + "\n",
    "tsconfig.json":
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "Node16",
            moduleResolution: "Node16",
            rootDir: ".",
            outDir: "build",
            esModuleInterop: true,
            forceConsistentCasingInFileNames: true,
            noImplicitAny: true,
            noUncheckedIndexedAccess: true,
            skipLibCheck: true,
            strict: true,
            strictFunctionTypes: true,
          },
          include: [srcFolderName, generatedFolderName, testsFolderName],
          exclude: [`${srcFolderName}/services/**/src`],
        },
        null,
        2,
      ) + "\n",
    "AGENTS.md": getCliAgentsFile(),
    [generatedFolderName]: {
      "DBGeneratedSchema.ts":
        "export type DBGeneratedSchema = Record<string, { columns: Record<string, unknown> }>\n",
    },
    [srcFolderName]: {
      ...fromEntries(srcSubfolderNames.map((folderName) => [folderName, {}])),
      "index.ts": `
        import { defineConfig } from "@prostgles/prostgles";
        import type { DBGeneratedSchema } from "../${generatedFolderName}/DBGeneratedSchema";
        import { serviceManagerConfig } from "./serviceManager";

        const prostgles = defineConfig<DBGeneratedSchema>();

        export default prostgles({
          id: ${JSON.stringify(configId)},
          connection: {
            table_options: {},
          },
          services: serviceManagerConfig,
          tableConfig: {},
        });`,
      [servicesFolderName]: {
        myService: {
          "myService.service.ts": ` 
            import type { ProstglesService } from "@prostgles/prostgles/services";

            export const myService = {
              icon: "Extension",
              label: "My service",
              description: "Example local Docker service.",
              port: 8080,
              healthCheck: { endpoint: "/health" },
              endpoints: {
                "/hey": {
                  method: "GET",
                  inputSchema: undefined,
                  description: "Service info endpoint",
                  outputSchema: "string", 
                },
              }, 
            } as const satisfies ProstglesService;`,
          src: {
            Dockerfile: `
              FROM python:3.13-alpine

              WORKDIR /app
              RUN printf 'service-ok' > health
              RUN printf 'Hello from myService!' > hey

              EXPOSE 8080

              CMD ["python", "-m", "http.server", "8080", "--bind", "0.0.0.0"]`,
          },
        },
      },
      "serviceManager.ts": `
        import type { ServiceManagerConfig } from "@prostgles/prostgles/services";
        import { myService } from "./services/myService/myService.service";
        import path from "node:path";

        export const services = { myService };

        export const serviceManagerConfig = {
          services,
          serviceRoot: path.resolve(__dirname, "..", "..", "src", "services"),
        } satisfies ServiceManagerConfig<typeof services>;`,
    },
    [testsFolderName]: {
      "deployment.test.ts": `
        import assert from "node:assert/strict";
        import { resolve } from "node:path";
        import test from "node:test";
        import { createTestDeployment } from "@prostgles/prostgles/testing";
        import type { DBGeneratedSchema } from "../generated/DBGeneratedSchema";

        void test("starts the configured app with an isolated database", async (context) => {
          const deployment = await createTestDeployment<DBGeneratedSchema>({
            configPath: resolve(__dirname, "../.."),
            configId: ${JSON.stringify(configId)},
            users: [
              { key: "admin", type: "admin" },
              { key: "member", type: "default" },
            ],
            // Add deterministic rows with:
            // seed: async ({ projectDatabase }) => {
            //   await projectDatabase.query("INSERT INTO ...");
            // },
          });
          context.after(async () => await deployment.dispose());

          const client = await deployment.connectProjectAs("admin");

          assert.equal(client.socket.connected, true);
          assert.equal(client.auth.user?.type, "admin");
          assert.ok(client.db);

          const memberClient = await deployment.connectProjectAs("member");
          assert.equal(memberClient.socket.connected, true);
          assert.equal(memberClient.auth.user?.type, "default");
        });`,
    },
    "eslint.config.mjs": eslintConfig,
    ".gitignore": `
      node_modules/
      build/
      .env
      .prostgles/test-logs/
      *.log`,
    ".env.example": `
      # Fixed admin credentials for CLI development.
      PRGL_USERNAME=admin
      PRGL_PASSWORD=${environmentDefaults?.PRGL_PASSWORD ?? randomBytes(24).toString("base64url")}

      # Prostgles UI state. Created automatically when missing.
      PROSTGLES_STATE_DATABASE_URL=postgres://user:password@localhost:5432/prostgles_state_database

      # Database exposed by this config. Must use the same server as the state database.
      PROSTGLES_DATABASE_URL=postgres://user:password@localhost:5432/${configId}

      # Used by compose.yaml for its private PostgreSQL instance.
      PROSTGLES_DOCKER_DB_PASSWORD=${environmentDefaults?.PROSTGLES_DOCKER_DB_PASSWORD ?? randomBytes(24).toString("base64url")}

      # npm test starts an ephemeral PostgreSQL Docker container bound to 127.0.0.1 only.
      # Override only when the app needs a different PostgreSQL/PostGIS version.
      # PROSTGLES_TEST_POSTGRES_IMAGE=postgis/postgis:17-3.4`,
  }) as const;

const readCliDockerfile = (filename: "Dockerfile" | "DB.Dockerfile") => {
  const filePath = join(__dirname, filename);
  if (!existsSync(filePath)) {
    throw new Error(`Missing bundled ${filename}: ${filePath}`);
  }
  return readFileSync(filePath, "utf8");
};

export const getCliComposeFiles = ({ configId }: { configId: string }) =>
  ({
    "DB.Dockerfile": readCliDockerfile("DB.Dockerfile"),
    Dockerfile: `${readCliDockerfile("Dockerfile")}
      FROM runtime AS app

      WORKDIR /app

      COPY . .
      RUN npm install
      RUN npm run build

      ENV NODE_ENV=production

      CMD ["npm", "start"]`,
    "compose.yaml": `
      name: ${configId}

      services:
        app:
          build: .
          init: true
          restart: unless-stopped
          depends_on:
            db:
              condition: service_healthy
          environment:
            IS_DOCKER: "yes"
            NODE_ENV: production
            PRGL_USERNAME: \${PRGL_USERNAME:-admin}
            PRGL_PASSWORD: \${PRGL_PASSWORD:?Set PRGL_PASSWORD in .env}
            PROSTGLES_UI_HOST: "0.0.0.0"
            PROSTGLES_DATA_DIR: /var/lib/prostgles
            PROSTGLES_STATE_DATABASE_URL: postgres://postgres:\${PROSTGLES_DOCKER_DB_PASSWORD:?Set PROSTGLES_DOCKER_DB_PASSWORD in .env}@db:5432/prostgles_state
            PROSTGLES_DATABASE_URL: postgres://postgres:\${PROSTGLES_DOCKER_DB_PASSWORD:?Set PROSTGLES_DOCKER_DB_PASSWORD in .env}@db:5432/${configId}
            PROSTGLES_DOCKER_NETWORK: \${PROSTGLES_DOCKER_NETWORK:-${configId}-runtime}
            PROSTGLES_INSTANCE_ID: \${PROSTGLES_INSTANCE_ID:-${configId}}
          ports:
            - "\${PROSTGLES_DOCKER_IP:-127.0.0.1}:\${PROSTGLES_DOCKER_PORT:-3004}:3004"
          volumes:
            - prostgles-data:/var/lib/prostgles
            - /var/run/docker.sock:/var/run/docker.sock
          networks:
            - runtime

        db:
          build:
            context: .
            dockerfile: DB.Dockerfile
          command: postgres -c shared_preload_libraries=pg_stat_statements -c max_connections=200
          restart: unless-stopped
          environment:
            POSTGRES_DB: postgres
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: \${PROSTGLES_DOCKER_DB_PASSWORD:?Set PROSTGLES_DOCKER_DB_PASSWORD in .env}
          healthcheck:
            test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
            interval: 2s
            timeout: 3s
            retries: 30
          volumes:
            - database:/var/lib/postgresql/data
          networks:
            - runtime

      volumes:
        database:
        prostgles-data:

      networks:
        runtime:
          name: \${PROSTGLES_DOCKER_NETWORK:-${configId}-runtime}
          driver: bridge`,
    ".dockerignore": `
      .env
      .git
      .prostgles
      build
      node_modules
      *.log`,
  }) as const;

const getPackageJson = (configId: string) => ({
  name: configId,
  private: true,
  version: "0.0.0",
  main: "build/src/index.js",
  scripts: {
    build: "npm run lint && tsc --project tsconfig.json",
    dev: "prostgles dev --config .",
    lint: "eslint .",
    "lint:fix": "eslint . --fix",
    start: "prostgles start --config .",
    upgrade: "prostgles upgrade --config .",
    test: 'npm run build && node --env-file-if-exists=.env --test "build/tests/**/*.test.js"',
  },
  dependencies: { [packageJson.name]: `^${packageJson.version}` },
  devDependencies: {
    ...pickKeys(packageJson.dependencies, ["typescript"]),
    ...pickKeys(packageJson.devDependencies, [
      "@eslint/js",
      "eslint",
      "eslint-plugin-security",
      "typescript-eslint",
      "@types/node",
    ]),
  },
  exports: {
    "./generated": {
      types: "./build/generated/index.d.ts",
      default: "./build/generated/index.js",
    },
  },
});
const eslintConfig = `
  import eslint from "@eslint/js";
  import pluginSecurity from "eslint-plugin-security";
  import path from "node:path";
  import tseslint from "typescript-eslint";
  import { defineConfig } from "eslint/config";

  const semanticFilenameRule = {
    meta: {
      type: "problem",
      schema: [{ type: "string" }],
      messages: {
        invalidSuffix: "Files in this folder must end in '{{suffix}}'.",
      },
    },
    create(context) {
      const suffix = context.options[0];
      return {
        Program(node) {
          if (!path.basename(context.filename).endsWith(suffix)) {
            context.report({
              node,
              messageId: "invalidSuffix",
              data: { suffix },
            });
          }
        },
      };
    },
  };

  const semanticFileConfig = (folder, suffix) => ({
    files: [\`${srcFolderName}/\${folder}/**/*.ts\`],
    rules: {
      "prostgles-config/semantic-filename": ["error", suffix],
    },
  });

  export default defineConfig(
    {
      ignores: [
        "build", 
        "${generatedFolderName}", 
        "node_modules", 
        "eslint.config.mjs",
        "src/${servicesFolderName}/*/src",  
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    pluginSecurity.configs.recommended,
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
      files: ["${srcFolderName}/**/*.ts", "${testsFolderName}/**/*.ts"],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      plugins: {
        "prostgles-config": {
          rules: { "semantic-filename": semanticFilenameRule },
        },
      },
      rules: {
        "no-cond-assign": "error",
        "no-unused-vars": "off",
        "security/detect-object-injection": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-unnecessary-condition": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
      },
    },
    ${srcSubfolderNames
      .filter((f) => f !== "services")
      .map(
        (folderName) =>
          `semanticFileConfig("${folderName}", ".${folderName.slice(0, -1)}.ts")`,
      )
      .join(",\n    ")}
  );`;

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
  services:
    "Register Docker-backed runtimes with `services` so Prostgles can expose and control them.",
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

const getCliAgentsFile = () => `
  # Prostgles application

  This repository is a Prostgles config project: a typed TypeScript definition of a PostgreSQL-backed application or internal tool. Prostgles is the framework, not the application itself. It makes internal tools easier to build by providing the web UI, authentication, realtime transport, database connections, and deployment lifecycle; the user decides what the application does and this repository defines it.

  This project owns the application's database schema and behavior: permissions, display options, workspaces, server functions, hooks, migrations, and optional Docker services. There is normally no separate frontend or HTTP server to build; Prostgles derives the database UI and typed client API from this config.

  Treat \`src/index.ts\` as the composition root. Keep feature definitions in focused modules under \`src/\`, then assemble them into the default-exported config. Treat \`generated/DBGeneratedSchema.ts\` as generated output: use its types, but do not hand-edit it. Keep credentials and database URLs in \`.env\`, never in the config.

  ## Config structure

  - Import \`DBGeneratedSchema\` from \`generated/DBGeneratedSchema\`, create the typed config helper with \`const prostgles = defineConfig<DBGeneratedSchema>()\`, and default-export \`prostgles({ ... })\`. Keep the helper name \`prostgles\` so function return types can be discovered during schema generation.
  - Run \`npm run dev\` after schema or function changes. It rebuilds the config and refreshes \`generated/DBGeneratedSchema.ts\`, including \`GeneratedFunctionSchema\` for clients.
  - Read the resolved type declarations and JSDoc for config APIs such as \`tableConfig\`, \`tableHooks\`, and \`functions\`. Where you are not fully confident about behavior, inspect the **resolved package declaration/source** in the installed Prostgles packages instead of guessing.
  - ${schemaConfigGuidance.id}
  - ${schemaConfigGuidance.connection} ${connectionGuidance.db_schema_filter} ${connectionGuidance.display_options}
  - ${schemaConfigGuidance.databaseConfig}
  - ${schemaConfigGuidance.access_control} 
  - ${schemaConfigGuidance.watchSchemaType}
  - ${schemaConfigGuidance.onInitSQL} ${schemaConfigGuidance.onMount}

  ## Services

  - If a server function needs a non-Node.js runtime or system dependencies, implement that work as a service instead of running it directly in the function.
  - Define services under \`src/services/<serviceName>/\`, with the typed \`*.service.ts\` definition beside a \`src/\` Docker build context. Declare a health check and typed endpoints for every operation the app calls.
  - Register each service in \`src/serviceManager.ts\` and expose its config through the top-level \`services\` property. Service names must not collide with built-in Prostgles services or another app service.
  - Prostgles injects the host-owned service manager as \`context.serviceManager\` in \`onMount\`, table hooks, and server functions. In a function's \`run\` callback, destructure it from the function context with \`run: async (input, { context }) => { ... }\`.
  - Call \`context.serviceManager.getServiceWithRetries(serviceName)\` before using an endpoint. This is the instance shown in the Prostgles Services UI; do not construct another \`ServiceManager\`.

  ## Typed database object

  - The Prostgles \`dbo\` object available in \`onMount\`, \`tableHooks\`, and server functions is \`DBOFullyTyped<DBGeneratedSchema>\`. Table names, columns, filters, selects, inserts, updates, and results are fully typed.
  - Keep the schema and context generics connected when moving code into separate modules. Use \`ProstglesOnMount<DBGeneratedSchema, typeof services>\` for \`onMount\`, \`TableHooks<DBGeneratedSchema, ProstglesContext<typeof services>>\` for hooks, and \`createFunctionGroupDefinerWithContext<DBGeneratedSchema, ProstglesContext<typeof services>>()\` or \`createFunctionsDefinerWithContext<DBGeneratedSchema, ProstglesContext<typeof services>>()\` for functions that use app services.
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
  - Deployment stdout and stderr remain available after cleanup in \`.prostgles/test-logs/\`. The exact file is returned as \`deployment.logPath\`.
  - Test logs may be large. Inspect them with \`tail\` or search them with \`rg\`; do not read an entire log unless its size is known to be small.
  - If the deployment fixture blocks a valid scenario, inspect \`deployment.logPath\` and report the issue against \`@prostgles/prostgles\`; do not weaken the app or its assertions to work around the fixture.
  - Add test users through the fixture's \`users\` option and connect with \`connectProjectAs(userKey)\`. Sessions are seeded directly, so deployment tests do not need to exercise the login UI.
  - Add deterministic database state with the fixture's \`seed\` callback. Never use development or production database URLs for test setup.

  ## Deployment

  - Use \`docker compose up -d --build\` for production deployment. Keep Compose as the operational interface for logs, restarts, upgrades, and shutdown.
  - The generated stack persists PostgreSQL and \`/var/lib/prostgles\`. Back up both named volumes.
  - Managed services use the configured private Docker runtime network. Do not publish their ports unless an external client explicitly requires access.

  ## Tables, display options, and hooks

  - ${schemaConfigGuidance.tableConfig} ${schemaConfigGuidance.tableConfigMigrations}
  - ${schemaConfigGuidance.tableHooks} Use hooks such as \`beforeEach\`, \`afterEach\`, and \`afterAll\` for application behavior instead of PostgreSQL triggers as this allows interaction with typescript and provides full type safety.
  - \`afterEach\` and \`afterAll\` run inside the still-uncommitted mutation transaction. Use their \`row\` or \`rows\` values for the affected records and \`dbx\` for reads or writes that must share that transaction. A separate handler, including a \`dbo\` captured from \`onMount\`, cannot see newly inserted rows until commit.
  - Do not start detached work from a hook that immediately re-queries a newly inserted row through another database connection. Await work whose failure should roll back the mutation; for post-commit background processing, write an outbox/queue record in the hook transaction and let a separate consumer process it after commit.
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
  - Keep secrets on the server and use database transactions for multi-step writes.`;
