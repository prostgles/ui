module.exports = {
  // "root": true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    allowImportExportEverywhere: true,
    project: ["./tsconfig.json"],
    // "tsconfigRootDir": __dirname,
  },

  // "ingorePatterns": "**/*.d.ts, **/*.js",
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    "no-cond-assign": "error",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "no-async-promise-executor": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-empty-function": "off",
    "no-unused-vars": "off",
    "no-empty": "off",
    "no-constant-condition": "error",
    "@typescript-eslint/no-unnecessary-condition": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        disallowTypeAnnotations: false,
      },
    ],
    "@typescript-eslint/quotes": [
      "error",
      "double",
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
  },
};
