import { getE2ETemplate } from "../../../e2e/cli/template";
import { fixIndent } from "@common/utils";
import { randomBytes } from "crypto";
import type { SchemaConfig, SchemaConfigConnection } from "../schemaConfig";
import packageJson from "../../package.json";
import { fromEntries, pickKeys } from "prostgles-types";
import { dirname, join, resolve } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { format, getFileInfo, resolveConfig, type Options } from "prettier";
import {
  cliAssetFileNames,
  cliFileNames,
  type CliFileName,
} from "./cliFileNames";

export const saveCliTemplateFiles = async ({
  configId,
  targetPath,
  environmentDefaults,
  formatConfigPath = targetPath,
}: {
  configId: string;
  targetPath: string;
  formatConfigPath?: string;
  environmentDefaults?: {
    PRGL_PASSWORD?: string;
    PROSTGLES_DOCKER_DB_PASSWORD?: string;
  };
}) => {
  await saveFolderFiles(
    targetPath,
    getCliTemplateFiles({ configId, environmentDefaults }),
    await getFormatOptions(formatConfigPath),
  );
};

export const saveCliComposeFiles = async ({
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
  await saveFolderFiles(targetPath, files, await getFormatOptions(targetPath));
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

const saveFolderFiles = async (
  targetPath: string,
  folderFiles: FolderFiles,
  formatOptions: Options,
  ignorePath = join(targetPath, cliFileNames.prettierIgnore),
) => {
  const prettierIgnore = folderFiles[cliFileNames.prettierIgnore];
  if (typeof prettierIgnore === "string") {
    mkdirSync(targetPath, { recursive: true });
    writeFileSync(ignorePath, fixIndent(prettierIgnore));
  }
  for (const [relativePath, content] of Object.entries(folderFiles)) {
    const fullPath = join(targetPath, relativePath);
    const fullPathDirectory = dirname(fullPath);
    if (typeof content === "string") {
      mkdirSync(fullPathDirectory, { recursive: true });
      const text = fixIndent(content);
      const { inferredParser } = await getFileInfo(fullPath, { ignorePath });
      writeFileSync(
        fullPath,
        inferredParser ?
          await format(text, { ...formatOptions, filepath: fullPath })
        : text,
      );
    } else {
      mkdirSync(fullPath, { recursive: true });
      await saveFolderFiles(fullPath, content, formatOptions, ignorePath);
    }
  }
};

const getFormatOptions = async (targetPath: string): Promise<Options> =>
  (await resolveConfig(join(targetPath, cliFileNames.packageJson), {
    useCache: false,
  })) ?? (JSON.parse(readCliAsset(cliFileNames.prettierConfig)) as Options);

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
    [cliFileNames.readme]: `
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
    [cliFileNames.packageJson]:
      JSON.stringify(getPackageJson(configId), null, 2) + "\n",
    [cliFileNames.tsconfig]:
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
    [cliFileNames.agents]: getCliAgentsFile(),
    [generatedFolderName]: {
      [cliFileNames.dbGeneratedSchema]:
        "export type DBGeneratedSchema = Record<string, { columns: Record<string, unknown> }>\n",
    },
    [srcFolderName]: {
      ...fromEntries(srcSubfolderNames.map((folderName) => [folderName, {}])),
      "index.ts": `
        import { defineConfig } from "@prostgles/app";
        import type { DBGeneratedSchema } from "../${generatedFolderName}/${cliFileNames.dbGeneratedSchema.slice(0, -3)}";
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
            import type { ProstglesService } from "@prostgles/app/services";

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
            [cliFileNames.dockerfile]: `
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
        import type { ServiceManagerConfig } from "@prostgles/app/services";
        import { myService } from "./services/myService/myService.service";
        import path from "node:path";

        export const services = { myService };

        export const serviceManagerConfig = {
          services,
          serviceRoot: path.resolve(__dirname, "..", "..", "src", "services"),
        } satisfies ServiceManagerConfig<typeof services>;`,
    },
    e2e: getE2ETemplate(configId),
    [testsFolderName]: {
      "deployment.test.ts": `
        import assert from "node:assert/strict";
        import test from "node:test";
        import { createTestDeployment } from "@prostgles/app/testing";
        import type { DBGeneratedSchema } from "../${generatedFolderName}/${cliFileNames.dbGeneratedSchema.slice(0, -3)}";

        void test("starts the configured app with an isolated database", async (context) => {
          const deployment = await createTestDeployment<DBGeneratedSchema>({
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
    [cliFileNames.eslintConfig]: eslintConfig,
    [cliFileNames.prettierConfig]: readCliAsset(cliFileNames.prettierConfig),
    [cliFileNames.prettierIgnore]: `
      node_modules/
      build/
      ${generatedFolderName}/
      .prostgles/
      e2e/test-results/
      e2e/playwright-report/
      src/${servicesFolderName}/*/src/`,
    [cliFileNames.gitIgnore]: `
      node_modules/
      build/
      .env
      .prostgles/test-logs/
      *.log`,
    [cliFileNames.environmentExample]: `
      # Fixed admin credentials for CLI development.
      PRGL_USERNAME=admin
      PRGL_PASSWORD=${environmentDefaults?.PRGL_PASSWORD ?? randomBytes(24).toString("base64url")}

      # Prostgles UI state. Created automatically when missing.
      PROSTGLES_STATE_DATABASE_URL=postgres://user:password@localhost:5432/prostgles_state_database

      # Database exposed by this config. Must use the same server as the state database.
      PROSTGLES_DATABASE_URL=postgres://user:password@localhost:5432/${configId}

      # Used by compose.yaml for its private PostgreSQL instance.
      PROSTGLES_DOCKER_DB_PASSWORD=${environmentDefaults?.PROSTGLES_DOCKER_DB_PASSWORD ?? randomBytes(24).toString("base64url")}

      # Optional test-only override. By default npm test builds DB.Dockerfile.
      # PROSTGLES_TEST_POSTGRES_IMAGE=postgis/postgis:17-3.6-alpine`,
  }) as const satisfies FolderFiles &
    Record<
      Exclude<CliFileName, typeof cliFileNames.dbGeneratedSchema>,
      string
    > & {
      [generatedFolderName]: Record<
        typeof cliFileNames.dbGeneratedSchema,
        string
      >;
    };

const readCliAsset = (filename: (typeof cliAssetFileNames)[number]) => {
  const filePath = join(__dirname, filename);
  if (!existsSync(filePath)) {
    throw new Error(`Missing bundled ${filename}: ${filePath}`);
  }
  return readFileSync(filePath, "utf8");
};

export const getCliComposeFiles = ({ configId }: { configId: string }) =>
  ({
    [cliFileNames.dbDockerfile]: readCliAsset(cliFileNames.dbDockerfile),
    [cliFileNames.dockerfile]: `${readCliAsset(cliFileNames.dockerfile).trimEnd()}\n\n${fixIndent(`
      FROM runtime AS app

      WORKDIR /app

      COPY . .
      RUN npm install
      RUN npm run build

      ENV NODE_ENV=production

      CMD ["npm", "start"]`)}\n`,
    [cliFileNames.compose]: `
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
            dockerfile: ${cliFileNames.dbDockerfile}
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
    [cliFileNames.dockerIgnore]: `
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
    format: "prettier --write .",
    "format:check": "prettier --check .",
    start: "prostgles start --config .",
    upgrade: "prostgles upgrade --config .",
    "test:e2e":
      "npm run build && tsc -p e2e/tsconfig.json && playwright test --config e2e/playwright.config.ts",
    "test:e2e:install": "playwright install chromium",
    "test:e2e:report": "playwright show-report e2e/playwright-report",
    test: 'npm run build && node --env-file-if-exists=.env --test "build/tests/**/*.test.js"',
  },
  dependencies: {
    [packageJson.name]: getRuntimeDependency(),
  },
  devDependencies: {
    "@playwright/test": packageJson.devDependencies["@playwright/test"],
    prettier: "^3.4.2",
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

const getRuntimeDependency = () => {
  const runtimePath = resolve(__dirname, "../../../..");
  // Source checkouts can be ahead of the published npm version.
  return existsSync(join(runtimePath, "src/cli/cli.ts")) ?
      `file:${runtimePath}`
    : `^${packageJson.version}`;
};
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
        "e2e/test-results",
        "e2e/playwright-report",
        "eslint.config.mjs",
        "src/${servicesFolderName}/*/src",  
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    pluginSecurity.configs.recommended,
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
      files: ["${srcFolderName}/**/*.ts", "${testsFolderName}/**/*.ts", "e2e/**/*.ts"],
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
        "no-magic-numbers": "warn",
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
    "Configure `access_control` as an array of normal rules with explicit `userTypes`, `dbPermissions`, and optional `dbsPermissions`. Omit generated IDs; use `viewPublishedWorkspaces.workspaceNames` and `publishedMethods` to reference existing, uniquely named published resources on this connection.",
  audit:
    'Use built-in `audit` for row-change history, for example `audit: { tableName: "audit_log", tables: { projects: 1, conditions: 1 } }`. Prostgles-server creates an append-only audit table and PostgreSQL triggers; the UI exposes history from row cards. Do not recreate this with audit tables, hooks, or calls in every function. Omit `tables` to audit all eligible tables; use `excludeColumns` for sensitive fields and `idColumns` for tables without primary keys. Keep domain events such as approval reasons separate when row history alone is insufficient. Audit read permissions still need to respect application access boundaries. When replacing custom audit hooks, preserve existing history and workflow reasons; use a new managed audit table instead of reusing an incompatible application table.',
  connection:
    "Keep non-secret connection presentation settings in `connection`; database URLs belong in `.env`.",
  databaseConfig:
    "Use `databaseConfig` for host-managed database features such as file storage and REST access.",
  functions:
    "Use top-level `functions` for explicit workflow actions, privileged operations, and server-only business logic. Prefer built-in table insert/edit forms for ordinary CRUD instead of wrapping each insert or update in a function.",
  id: "Keep `id` stable because it identifies the deployed configuration.",
  llm_credentials:
    "Use `llm_credentials` only when this config should replace the instance-wide LLM credentials. Omit it to preserve existing credentials; an empty array clears them. Read secret values from environment variables and give credentials unique names for access-rule references.",
  joins:
    "Omit `joins` and use inferred foreign-key joins by default, including composite foreign keys and junction tables. The top-level `joins` option is experimental; do not enumerate existing FK relationships. An explicit path with `on` selects a known relationship; it does not define a new non-FK join. When a permission filter requires a non-FK relationship, declare only that relationship and verify the resolved server retains other inferred FK joins. Older servers suppress inferred joins involving either custom-join table; fix/upgrade the source package instead of enumerating the schema's joins.",
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
  tableHooks:
    "Define `tableHooks` as a separate top-level config property. Do not implement authorization in table hooks; enforce user, role, ownership, and tenant access through `access_control`.",
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
  - ${schemaConfigGuidance.audit}
  - ${schemaConfigGuidance.access_control} 
  - ${schemaConfigGuidance.watchSchemaType}
  - ${schemaConfigGuidance.onInitSQL} ${schemaConfigGuidance.onMount}

  ## Access control

  - Each user type may appear in only one config rule. Keep \`public\` in its own rule; it cannot be combined with non-public user types. Table hooks validate this on access-rule user-type inserts and updates.
  - CLI sync persists access rules in the same tables used by the UI editor. UI edits take effect, but the next sync replaces this connection's rules from config; omitted or empty \`access_control\` clears them. Rules still linked to other connections are preserved.
  - Reference shared dashboards with \`dbsPermissions.viewPublishedWorkspaces.workspaceNames\`. Matching top-level \`workspaces\` are persisted under an admin owner before resolving permissions. Resource names must resolve uniquely; \`publishedMethods\` refers to existing published functions on this connection, separate from top-level \`functions\`.
  - Define authorization in \`access_control\` using explicit per-table \`select\`, \`insert\`, \`update\`, and \`delete\` permissions. Use \`type: "Custom"\` with \`customTables\` for granular access. Do not put authorization checks in \`beforeEach\`, \`afterEach\`, or \`afterAll\` hooks, including admin-only mutation checks.
  - Read the resolved \`SchemaConfigAccessControl\` and rule types before implementing permissions. Each CLI rule contains \`userTypes\` and \`dbPermissions\`: \`forcedFilterDetailed\`, \`checkFilterDetailed\`, and \`forcedDataDetail\` map to the server's \`forcedFilter\`, \`checkFilter\`, and \`forcedData\`. Use the config property names and inspect their filter/context syntax rather than copying raw server publish rules.
  - Forced filters restrict which existing rows a user can select, update, or delete. Apply ownership, tenant, and related-table membership restrictions to every relevant operation; select permissions alone do not protect writes.
  - Check filters require inserted or updated rows to satisfy the permission condition or the write fails. Use them to prevent linking to an unauthorized parent or moving a row into another tenant/project. For updates, combine a forced filter on existing rows with a check filter on the resulting rows.
  - Joined permission filters support nested \`$and\`/\`$or\` groups inside their \`filter\`. Put current-user and allowed-role conditions inside one \`$existsJoined\` so they must match the same membership row; separate existence checks can match different users. Ensure the join correlates every scope key, such as both project and discipline.
  - Forced data supplies trusted insert/update values and overrides client input, such as the authenticated user's ID or a fixed status. Use server context for identity values; never trust a client-supplied owner or tenant ID. Configure insert and update rules as needed.
  - Use \`fields\` to limit readable/writable columns, \`filterFields\` to limit query filter columns, \`orderByFields\` for selectable sort columns, and update \`dynamicFields\` when editable columns depend on the row. Grant only the operations and fields required by the workflow.
  - Verify permissions through authenticated deployment tests: allowed and denied reads/writes, cross-tenant access, forged ownership values, and unauthorized foreign-key changes. Hooks are for application validation and transactional side effects; they are not the authorization boundary.

  ## LLM agents

  - ${schemaConfigGuidance.llm_credentials}
  - Use \`access_control[].allowedLLM\` entries shaped as \`{ credentialName, promptName }\` to reference existing, uniquely named LLM credentials and prompts. Set \`llm_daily_limit\` in the access rule when needed.
  - In a server function, call \`ctx.context.startAgent({ prompt, input, outputSchema }, ctx)\`, where \`ctx\` is the function's second argument. This uses Prostgles' configured models and credentials and runs as the caller; pass the original context to retain their identity and request. The returned object is typed from \`outputSchema\`.
  - \`startAgent\` currently requires \`clientReq\` alongside the validated \`user\`. Use \`ctx.clientReq\` from a server function's second argument, or \`localParams?.clientReq\` from a hook's arguments, and pass it with the validated user as \`{ user, clientReq }\`.
  - Read the resolved \`ProstglesContext\` and agent option types before adding tools or database access. \`startAgent\` also accepts \`signal\` and \`timeout\` in milliseconds; tool auto-approval defaults to false.

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
  - Use the same table-handler APIs on a hook's \`dbx\` to keep work in the mutation transaction. Before writing per-row loops, manual joins, or raw SQL, check the installed \`prostgles-types\` declarations (\`TableHandler\`, \`SelectParams\`, \`FullFilter\`, \`InsertParams\`, \`InsertDataWithNested\`) and \`prostgles-server\` implementation for built-in support. Client and restricted server-function handlers expose only the operations allowed by their permissions.
  - Bulk inserts: use \`insertMany(rows, params?)\` for multiple rows, rather than calling \`insert\` in a loop or \`Promise.all\`. For example, \`if (disciplines.length) await dbx.project_members.insertMany(disciplines.map(discipline_id => ({ project_id: row.id, discipline_id })));\`. Include any other required columns from your schema. Use \`insert(row, params?)\` for one row and \`{ returning: ["id"] }\` when you need inserted IDs without re-querying.
  - Bulk updates/deletes: use \`update(filter, data, params?)\` or \`delete(filter, params?)\` to affect all matching rows, including filters such as \`{ id: { $in: ids } }\`. Use \`updateBatch([[filter, data], ...], params?)\` when each update needs different data. \`upsert(filter, data, params?)\` inserts or updates a matching record; inserts also support \`onConflict\` options. Check their documented conflict semantics and the table's unique constraints before choosing one.
  - Nested inserts: \`insert\` and \`insertMany\` can create related rows through foreign-key relationships in one transaction. For example, with \`project_members.project_id REFERENCES projects(id)\`, \`dbx.projects.insert({ name: "Example", project_members: [{ discipline_id }] }, { returning: "*" })\` creates the project and its member, propagating the parent key. Use actual related table names and required fields; do not manually insert a parent and loop over children when a nested insert fits.
  - The runtime also supports inserting a referenced row through an FK column, for example \`tasks.insert({ title: "Example", project_id: { name: "New project" } })\`. This creates a new project, not a link to an existing one; pass an existing ID to link instead. Relationship ambiguity and nested-insert permissions still apply. The installed types may not fully express FK-column nested objects: inspect the resolved declarations and propose fixing \`prostgles-types\`/\`prostgles-server\` rather than adding broad casts or app-level workarounds.
  - Reads: use \`find\`, \`findOne\`, and \`count\` with typed filters and \`select\`, \`orderBy\`, \`limit\`, and \`offset\` options. Filters support operators such as \`$in\`, \`$ilike\`, \`$and\`, and \`$or\`. Request only needed columns and use \`count\` rather than fetching rows to count them.
  - Relational reads and aggregates: selects support nested related-table results, explicit \`$leftJoin\`/\`$innerJoin\` paths, and aggregate functions such as \`$count\` and \`$sum\` with \`groupBy\`. Prefer these to per-row lookups or client-side aggregation; inspect \`SelectParams\` and installed examples for the exact syntax and join path when multiple foreign keys exist.
  - For multi-step server-side work outside a hook, use \`dbo.tx(async (dbx) => { ... })\` when available and use that callback's handlers throughout. Inside hooks, use the provided \`dbx\`. Raw SQL is available in unrestricted contexts but bypasses table-handler hooks; prefer handlers when they express the operation.
  - Every table and view handler supports realtime \`subscribe\` and \`subscribeOne\`, for example \`dbo.orders.subscribe(filter, params, onData)\`. Prefer subscriptions over polling the database. Keep the returned subscription handler and call \`unsubscribe()\` during cleanup; an \`onMount\` callback can return that cleanup function.

  ## Project structure

  - Keep \`src/index.ts\` focused on composing and exporting the config.
  - Put server functions in \`src/functions/\`, table definitions in \`src/tableConfigs/\`, display metadata in \`src/tableOptions/\`, and hooks in \`src/tableHooks/\`. Add domain subfolders when a folder becomes crowded.
  - Use semantic names ending in \`*.function.ts\`, \`*.tableConfig.ts\`, \`*.tableOptions.ts\`, and \`*.tableHooks.ts\`. Examples: \`deployProject.function.ts\`, \`orders.tableConfig.ts\`, \`customers.tableOptions.ts\`, and \`users.tableHooks.ts\`.
  - The generated ESLint config enforces these suffixes inside their corresponding folders. Run \`npm run lint\` before committing.

  ## Local development

  - For disposable development or UI checks, use \`npm run dev -- --temp-db\` or \`npm start -- --temp-db\`. The CLI manages PostgreSQL using the same helper as tests; no database URLs or manual Docker commands are needed. Docker must be available.
  - Each command creates fresh state and project databases, overrides database URLs from the environment, and removes its container on exit. Dev reloads keep the databases until the command stops. Use normal dev/start with configured URLs only when persistent data is required.
  - PostgreSQL logs are saved under \`.prostgles/test-logs/\`; the CLI prints the exact path. Logs remain after cleanup. Inspect these logs when database setup fails instead of starting another container.

  ## Tests

  - Do not manually start PostgreSQL containers or supply database credentials for tests. Run the existing \`npm test\` workflow directly; it provisions and cleans up its own databases. Build and lint commands do not need a database.
  - Run \`npm test\` before committing. Tests use \`@prostgles/app/testing\` to start the real app against fresh state and project databases without opening the UI.
  - For browser workflows, use \`e2e/AGENTS.md\`, \`npm run test:e2e\`, and the shared \`@prostgles/app/testing/ui\` helpers. Play passing and failing test videos with \`npm run test:e2e:report\`.
  - Keep deployment tests in \`tests/\`. Each call to \`createTestDeployment\` uses the current app directory and its \`DB.Dockerfile\` when present, starts a disposable PostgreSQL Docker container bound only to \`127.0.0.1\`, creates fresh state and project databases, and removes the container during cleanup. Set \`PROSTGLES_TEST_POSTGRES_IMAGE\` only to override the Dockerfile.
  - \`npm test\` automatically saves each test deployment's stdout and stderr to \`.prostgles/test-logs/<timestamp>-<random>.log\` relative to the app root. Logs remain after cleanup; the exact file is returned as \`deployment.logPath\` and included in deployment startup errors. No custom logging command or output redirection is needed to capture deployment logs.
  - PostgreSQL stdout and stderr are also saved to \`deployment.databaseLogPath\` (the app log path plus \`.postgres.log\`), including database startup failures. These logs remain after cleanup.
  - After a test failure, inspect the existing logs before rerunning tests or requesting custom commands. Use \`ls -t .prostgles/test-logs/\` to find recent logs, then \`tail -n 200 .prostgles/test-logs/<filename>\` or \`rg -n -i 'error|failed' .prostgles/test-logs/<filename>\`. Logs may be large; do not read an entire log unless its size is known to be small.
  - These files contain deployment output, not the npm/build/test-runner output. Check the test command's terminal output for lint, TypeScript, assertion, or Docker setup failures. Failures before the deployment starts may not create a log file.
  - If the deployment fixture blocks a valid scenario, inspect \`deployment.logPath\` and report the issue against \`@prostgles/app\`; do not weaken the app or its assertions to work around the fixture.
  - Add test users through the fixture's \`users\` option and connect with \`connectProjectAs(userKey)\`. Sessions are seeded directly, so deployment tests do not need to exercise the login UI.
  - Add deterministic database state with the fixture's \`seed\` callback. Never use development or production database URLs for test setup.

  ## Deployment

  - Use \`docker compose up -d --build\` for production deployment. Keep Compose as the operational interface for logs, restarts, upgrades, and shutdown.
  - The generated stack persists PostgreSQL and \`/var/lib/prostgles\`. Back up both named volumes.
  - Managed services use the configured private Docker runtime network. Do not publish their ports unless an external client explicitly requires access.

  ## Tables, display options, and hooks

  - ${schemaConfigGuidance.tableConfig} ${schemaConfigGuidance.tableConfigMigrations}
  - ${schemaConfigGuidance.tableHooks} Use hooks such as \`beforeEach\`, \`afterEach\`, and \`afterAll\` for typed application validation and side effects of table-handler mutations. Use built-in \`audit\` for change tracking. Raw SQL does not run table-handler hooks; use database constraints for invariants that must hold for every write.
  - \`afterEach\` and \`afterAll\` run inside the still-uncommitted mutation transaction. Use their \`row\` or \`rows\` values for the affected records and \`dbx\` for reads or writes that must share that transaction. A separate handler, including a \`dbo\` captured from \`onMount\`, cannot see newly inserted rows until commit.
  - Do not start detached work from a hook that immediately re-queries a newly inserted row through another database connection. Await work whose failure should roll back the mutation; for post-commit background processing, write an outbox/queue record in the hook transaction and let a separate consumer process it after commit.
  - ${connectionGuidance.table_options} Keep each table's options in its matching \`*.tableOptions.ts\` module and merge them under \`connection.table_options\`.
  - Give every JSONB column a \`jsonbSchema\` or \`jsonbSchemaType\` so its contents are validated and typed.
  - Follow PostgreSQL schema best practices: use primary and foreign keys, appropriate nullability, unique constraints, and indexes. Model fixed sets of values as lookup tables with \`isLookupTable\` and references instead of \`CHECK (value IN (...))\` constraints.
  - ${schemaConfigGuidance.joins}

  ## Table forms first

  - Table insert/edit forms derive controls from column types, defaults, JSONB schemas, foreign keys, and permissions. They provide FK autocomplete, related-row search, nested inserts where permitted, and file uploads. Model relationships and configure useful referenced-table card labels instead of asking users to enter raw IDs or duplicate existing organisations by name.
  - Grant the intended users the required insert/update fields and select access to referenced lookup rows through \`access_control\`. Use forced data for trusted values such as the current user. Verify the flow as a non-admin; a function's \`userFilter\` does not grant table-form permissions. Administrators retain full access, as in the access-control UI.
  - If creating a project also creates default memberships, put that setup in a transactional insert hook using \`dbx\`, so the table form retains autocomplete and all writes commit or roll back together. Keep a dedicated function when the operation is an explicit business workflow rather than an ordinary row mutation.

  ## Workspaces

  - ${schemaConfigGuidance.workspaces} Include tables and, where useful, aggregate SQL results, bar charts, time charts, maps, and summary statistics.
  - Keep window IDs stable and ensure every layout item references the matching window ID.

  ## File storage

  - Enable managed file storage with \`databaseConfig.file_table_config\`. For local storage, use \`{ fileTable: "files", storageType: { type: "local" } }\`. Prostgles creates and manages the file table and serves its files.
  - For S3 storage, use \`storageType: { type: "S3", credential_id }\`; configure the credential in Prostgles and never put access keys in this repository.
  - Reference \`files.id\` from application tables with foreign keys rather than storing file URLs. Referencing tables must have a primary key. Use \`referencedTables\` when file type or size restrictions are required.
  - For PDF source references, configure \`annotationsTable: "file_annotations"\` alongside \`fileTable\` and \`storageType\`. Prostgles creates the annotation table and marks it as \`file-annotations\` in the client schema; do not create a replacement annotation table or set that marker manually.
  - Reference an annotation from a domain row, for example \`conditions.columns.source_annotation_id: "integer REFERENCES file_annotations(id)"\`, or use a junction table for multiple excerpts. An annotation stores \`file_id\`, selected \`text\`, a one-based \`page\`, and \`rectangles\` for PDF highlights. Use the PDF viewer's text-selection annotation flow instead of inventing rectangle coordinates. A page number or copied quote alone does not preserve the highlighted source section.
  - The PDF viewer displays saved highlights and an annotation selector. An FK opens the related annotation row; do not assume it automatically opens the PDF at that highlight. Include the source relation in the row card and verify the full navigation flow. Keep managed table definitions out of \`tableConfig\`, since a same-name definition replaces the managed definition.
  - Configure annotation read/write permissions explicitly and restrict them to files the user may access. A foreign key does not grant permission. Ensure each condition's annotation belongs to its source file/version and project; test that users cannot link another project's excerpt. Once an excerpt is used as reviewed evidence, prevent edits or deletion that would change its text, file, page, or highlight coordinates; create a new annotation for corrections.
  - Set \`extractText: false\` for manual PDF text annotations without server-side extraction, or \`extractText: true\` for extraction through the managed documents service (also supported without an annotation table). With annotations configured, omitting \`extractText\` preserves automatic extraction. Older runtimes ignore this flag; upgrade/fix the runtime instead of adding app-level extraction workarounds.
  - File retention is not revision history. Managed file storage does not currently provide a logical document/revision model. When revisions are required, retain a distinct file per immutable revision and reference that revision from evidence, submissions, and annotations. Keep domain metadata and review/approval rules in the app. Propose reusable file versioning in \`prostgles-server\` before duplicating storage/version-management machinery in consuming apps; audit row history does not preserve overwritten file bytes.
  - Local file data lives outside PostgreSQL. Use persistent storage and include it in deployment backups.

  ## Server-side functions

  - ${schemaConfigGuidance.functions}
  - Organize \`functions\` into groups shaped as \`{ userFilter, functions }\`. The group filter controls which authenticated users receive those functions.
  - Create a schema-aware group helper with \`createFunctionGroupDefiner<DBGeneratedSchema>()\`. For function maps kept in separate modules, use \`createFunctionsDefiner<DBGeneratedSchema>()\` so names, database context, inputs, and return types remain inferred across imports.
  - Define individual functions with \`defineFunction({ input, description, run })\`. Inputs use Prostgles JSONB field definitions and are validated before \`run\` executes.
  - Functions have restricted database access by default. Set \`unrestrictedDbAccess: true\` only when the function needs raw SQL, transactions, or client DB-handler generation.
  - Keep secrets on the server and use database transactions for multi-step writes.`;
