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
    dependencies: { prostgles: `^${packageJson.version}` },
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
  envExample: fixIndent(`
      # Prostgles UI state database. This stores users, settings, and connections.
      # POSTGRES_URL=postgres://user:password@localhost:5432/prostgles_state

      # Database exposed by this config.
      # PROSTGLES_DATABASE_URL=postgres://user:password@localhost:5432/application`),
} as const;
