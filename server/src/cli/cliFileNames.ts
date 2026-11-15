export const cliFileNames = {
  dbGeneratedSchema: "DBGeneratedSchema.ts",
  prettierConfig: ".prettierrc",
  prettierIgnore: ".prettierignore",
  environmentExample: ".env.example",
  packageJson: "package.json",
  tsconfig: "tsconfig.json",
  readme: "README.md",
  agents: "AGENTS.md",
  eslintConfig: "eslint.config.mjs",
  gitIgnore: ".gitignore",
  dockerfile: "Dockerfile",
  dbDockerfile: "DB.Dockerfile",
  compose: "compose.yaml",
  dockerIgnore: ".dockerignore",
} as const;

export type CliFileName = (typeof cliFileNames)[keyof typeof cliFileNames];

export const cliAssetFileNames = [
  cliFileNames.dockerfile,
  cliFileNames.dbDockerfile,
  cliFileNames.prettierConfig,
] as const;
