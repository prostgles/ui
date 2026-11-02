import serverConfig from "../server/eslint.config.mjs";

export default [
  ...serverConfig.filter((config) => !config.ignores),
  {
    ignores: ["**/node_modules/**", "**/build/**", "**/*.d.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tests/tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
