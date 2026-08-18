import { fixIndent } from "@common/utils";
import { randomBytes } from "crypto";
import packageJson from "../../package.json";
import { getCliAgentsFile } from "./getCliAgentsFile";

export const srcFolderName = "src";
export const generatedFolderName = "generated";
export const testsFolderName = "tests";
export const srcSubfolderNames = [
  "functions",
  "tableConfigs",
  "tableOptions",
  "tableHooks",
] as const;

const eslintConfig = fixIndent(`
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
    files: [\`src/\${folder}/**/*.ts\`],
    rules: {
      "prostgles-config/semantic-filename": ["error", suffix],
    },
  });

  export default defineConfig(
    {
      ignores: ["build", "generated", "node_modules", "eslint.config.mjs"],
    },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    pluginSecurity.configs.recommended,
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
      files: ["src/**/*.ts", "tests/**/*.ts"],
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
    semanticFileConfig("functions", ".function.ts"),
    semanticFileConfig("tableConfigs", ".tableConfig.ts"),
    semanticFileConfig("tableOptions", ".tableOptions.ts"),
    semanticFileConfig("tableHooks", ".tableHooks.ts"),
  );`);

export const cliTemplateFiles = {
  package: {
    private: true,
    version: "0.0.0",
    main: "build/src/index.js",
    scripts: {
      build: "npm run lint && tsc --project tsconfig.json",
      dev: "prostgles dev --config .",
      lint: "eslint .",
      "lint:fix": "eslint . --fix",
      start: "prostgles start --config .",
      test: 'npm run build && node --env-file-if-exists=.env --test "build/tests/**/*.test.js"',
    },
    dependencies: { "@prostgles/prostgles": `^${packageJson.version}` },
    devDependencies: {
      "@eslint/js": packageJson.devDependencies["@eslint/js"],
      "@types/node": "^22.20.1",
      eslint: packageJson.devDependencies.eslint,
      "eslint-plugin-security":
        packageJson.devDependencies["eslint-plugin-security"],
      typescript: packageJson.dependencies["typescript"],
      "typescript-eslint": packageJson.devDependencies["typescript-eslint"],
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
      forceConsistentCasingInFileNames: true,
      noImplicitAny: true,
      noUncheckedIndexedAccess: true,
      skipLibCheck: true,
      strict: true,
      strictFunctionTypes: true,
    },
    include: [srcFolderName, generatedFolderName, testsFolderName],
  },
  DBGeneratedSchema:
    "export type DBGeneratedSchema = Record<string, { columns: Record<string, unknown> }>\n",
  agents: getCliAgentsFile(),
  deploymentTest: ({ configId }: { configId: string }) =>
    fixIndent(`
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
      });`),
  eslintConfig,
  gitignore: fixIndent(`
      node_modules/
      build/
      .env
      .prostgles/test-logs/
      *.log`),
  envExample: ({ configId }: { configId: string }) =>
    fixIndent(`
      # Fixed admin credentials for CLI development.
      PRGL_USERNAME=admin
      PRGL_PASSWORD=${randomBytes(24).toString("base64url")}

      # Prostgles UI state. Created automatically when missing.
      PROSTGLES_STATE_DATABASE_URL=postgres://user:password@localhost:5432/prostgles_state_database

      # Database exposed by this config. Must use the same server as the state database.
      PROSTGLES_DATABASE_URL=postgres://user:password@localhost:5432/${configId}

      # npm test starts an ephemeral PostgreSQL Docker container bound to 127.0.0.1 only.
      # Override only when the app needs a different PostgreSQL/PostGIS version.
      # PROSTGLES_TEST_POSTGRES_IMAGE=postgis/postgis:17-3.4`),
} as const;
