import path from "node:path";
import { configModuleConventions } from "./configModuleConventions";

export const getConfigModules = (
  fileNames: readonly string[],
  projectPath: string,
) => {
  const errors = new Map<string, string[]>();
  const modules = fileNames.flatMap((fileName) => {
    const [sourceFolder, folder] = path
      .relative(projectPath, fileName)
      .split(path.sep);
    if (sourceFolder !== "src" || !fileName.endsWith(".ts")) return [];
    const fileType = path.basename(fileName).split(".").at(-2);
    const convention = configModuleConventions.find(
      ({ folder: conventionFolder, type, aggregateName, legacySuffix }) =>
        conventionFolder === folder &&
        (fileType === type ||
          fileType === aggregateName ||
          fileType === legacySuffix),
    );
    if (!convention) return [];
    const { type, aggregateName } = convention;
    const isAggregate =
      aggregateName && path.basename(fileName) === `${aggregateName}.ts`;
    const stem = path.basename(fileName).slice(0, -`.${fileType}.ts`.length);
    const [firstWord = "", ...remainingWords] = stem.split(/[-_.]/);
    const name =
      firstWord.slice(0, 1).toLowerCase() +
      firstWord.slice(1) +
      remainingWords.map(capitalize).join("");
    const suffix = capitalize(type);
    const exportName =
      isAggregate ? aggregateName
      : name.endsWith(suffix) ? name
      : name + suffix;
    if (fileType !== type && !isAggregate) {
      errors.set(fileName, [
        `Use the .${type}.ts suffix instead of .${fileType}.ts.`,
      ]);
    }
    return [
      {
        fileName,
        exportName,
        type,
        entryName: aggregateName && !isAggregate ? stem : undefined,
        aggregateName,
      },
    ];
  });
  return { modules, errors };
};

export type ConfigModule = ReturnType<
  typeof getConfigModules
>["modules"][number];

const capitalize = (value: string) =>
  value.slice(0, 1).toUpperCase() + value.slice(1);
