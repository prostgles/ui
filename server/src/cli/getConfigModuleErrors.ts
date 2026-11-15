import path from "node:path";
import ts from "typescript";
import { getConfigModules } from "./getConfigModules";
import { getConfigAggregateErrors } from "./getConfigAggregateErrors";

export const getConfigModuleErrors = (program: ts.Program) => {
  const compilerOptions = program.getCompilerOptions();
  const projectPath =
    typeof compilerOptions.configFilePath === "string" ?
      path.dirname(compilerOptions.configFilePath)
    : program.getCurrentDirectory();
  const { modules, errors } = getConfigModules(
    program.getRootFileNames(),
    projectPath,
  );
  if (!modules.length) return errors;

  const validationPath = path.join(
    projectPath,
    "__prostgles_config_modules__.ts",
  );
  /* Check imports against the app's types without writing validation files. */
  const lines = [
    'import type { ConfigModuleTypes } from "@prostgles/app/eslint";',
    'import type { ServiceManagerConfig } from "@prostgles/app/services";',
    'import type { DBGeneratedSchema } from "./generated/DBGeneratedSchema.js";',
    'type AppConfig = typeof import("./src/index.js").default;',
    "type Services = AppConfig extends { services?: ServiceManagerConfig<infer Registry> } ? Registry : Record<never, never>;",
    "type ModuleTypes = ConfigModuleTypes<DBGeneratedSchema, Services>;",
    "type CheckedType<Value, Expected> = 0 extends (1 & Value) ? never : [Value] extends [never] ? never : Expected;",
  ];
  if (modules.some(({ entryName }) => entryName)) {
    lines.push(
      "type CheckedEntryType<Value, Expected> = Exclude<keyof Value, Expected extends unknown ? keyof Expected : never> extends never ? CheckedType<Value, Expected> : never;",
    );
  }
  const moduleLines = new Map<number, (typeof modules)[number]>();
  for (const [index, configModule] of modules.entries()) {
    const aggregateErrors = getConfigAggregateErrors(
      program,
      configModule,
      modules,
    );
    if (aggregateErrors.length) {
      errors.set(configModule.fileName, [
        ...(errors.get(configModule.fileName) ?? []),
        ...aggregateErrors,
      ]);
    }
    const importPath =
      "./" +
      path
        .relative(projectPath, configModule.fileName)
        .split(path.sep)
        .join("/")
        .slice(0, -3) +
      ".js";
    moduleLines.set(lines.length, configModule);
    lines.push(
      `import * as module${index} from ${JSON.stringify(importPath)};`,
    );
    moduleLines.set(lines.length, configModule);
    const expectedType = `ModuleTypes[${JSON.stringify(configModule.type)}]${configModule.entryName ? `[${JSON.stringify(configModule.entryName)}]` : ""}`;
    const checkedType =
      configModule.entryName ? "CheckedEntryType" : "CheckedType";
    lines.push(
      `module${index}.${configModule.exportName} satisfies ${checkedType}<typeof module${index}.${configModule.exportName}, ${expectedType}>;`,
    );
  }

  const host = ts.createCompilerHost(compilerOptions);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) => {
    if (fileName === validationPath) {
      return ts.createSourceFile(
        fileName,
        lines.join("\n"),
        ts.ScriptTarget.Latest,
        true,
      );
    }
    const sourceFile = program.getSourceFile(fileName);
    return sourceFile ?
        ts.createSourceFile(
          fileName,
          sourceFile.text,
          ts.ScriptTarget.Latest,
          true,
        )
      : getSourceFile(
          fileName,
          languageVersion,
          onError,
          shouldCreateNewSourceFile,
        );
  };
  const validationProgram = ts.createProgram({
    rootNames: [...program.getRootFileNames(), validationPath],
    options: { ...compilerOptions, noEmit: true },
    host,
  });
  const validationFile = validationProgram.getSourceFile(validationPath);
  if (!validationFile)
    throw new Error("Could not check config module exports.");
  for (const diagnostic of validationProgram.getSemanticDiagnostics(
    validationFile,
  )) {
    const line = validationFile.getLineAndCharacterOfPosition(
      diagnostic.start ?? 0,
    ).line;
    const configModule = moduleLines.get(line);
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n",
    );
    for (const affectedModule of configModule ? [configModule] : modules) {
      const moduleErrors = errors.get(affectedModule.fileName) ?? [];
      moduleErrors.push(
        `Expected named export "${affectedModule.exportName}" matching ${affectedModule.type}${affectedModule.entryName ? `[${JSON.stringify(affectedModule.entryName)}] for only "${affectedModule.entryName}"; assemble imports in ${affectedModule.aggregateName}.ts` : ""}: ${message}`,
      );
      errors.set(affectedModule.fileName, moduleErrors);
    }
  }
  return errors;
};

export const validateConfigModules = (configPath: string) => {
  const config = ts.getParsedCommandLineOfConfigFile(
    path.join(configPath, "tsconfig.json"),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      },
    },
  );
  if (!config) throw new Error("Could not read config project tsconfig.json.");
  const errors = getConfigModuleErrors(
    ts.createProgram(config.fileNames, config.options),
  );
  if (errors.size) {
    throw new Error(
      [...errors]
        .flatMap(([fileName, messages]) =>
          messages.map((message) => `${fileName}: ${message}`),
        )
        .join("\n"),
    );
  }
};
