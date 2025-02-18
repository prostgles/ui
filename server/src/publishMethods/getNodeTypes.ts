import * as ts from "typescript";
import * as path from "path";

export const getNodeTypes = async () => {
  const pathToProject = path.resolve(__dirname + "/../../../..");
  const files = await extractInstalledPackageTypes(pathToProject);
  return files.map((file) => ({
    ...file,
    filePath: file.filePath.split(pathToProject).pop(),
  }));
};

interface TypeFile {
  content: string;
  filePath: string;
}

/**
 * Extracts type definitions for installed packages as specified by their package.json
 * "types" (or "typings") field, including any referenced declaration files.
 *
 * @param projectDir - Absolute path to your project root.
 */
export function extractInstalledPackageTypes(projectDir: string): TypeFile[] {
  // 1. Read the project's package.json.
  const projectPkgPath = path.join(projectDir, "package.json");
  if (!ts.sys.fileExists(projectPkgPath)) {
    throw new Error(`Cannot find project package.json at ${projectPkgPath}`);
  }
  const projectPkgContent = ts.sys.readFile(projectPkgPath);
  if (!projectPkgContent) {
    throw new Error(`Failed to read ${projectPkgPath}`);
  }
  let projectPkg;
  try {
    projectPkg = JSON.parse(projectPkgContent);
  } catch (err) {
    throw new Error(`Failed to parse ${projectPkgPath}: ${err}`);
  }

  // 2. Gather dependency names from "dependencies" and "devDependencies".
  const deps = {
    ...(projectPkg.dependencies || {}),
    /** Include node types */
    ...(projectPkg.devDependencies || {}),
  };
  const depNames = Object.keys(deps).filter(
    (depName) => !depName.includes("prostgles-server"),
  );

  // 3. For each dependency, locate its package.json and check for a "types" or "typings" field.
  const rootTypeFiles: { pkgName: string; typesFilePath: string }[] = [];
  for (const depName of depNames) {
    // Assume package is at projectDir/node_modules/<depName>
    const depDir = path.join(projectDir, "node_modules", depName);
    const depPkgPath = path.join(depDir, "package.json");
    if (!ts.sys.fileExists(depPkgPath)) continue;
    const depPkgContent = ts.sys.readFile(depPkgPath);
    if (!depPkgContent) continue;
    let depPkg;
    try {
      depPkg = JSON.parse(depPkgContent);
    } catch {
      continue;
    }
    const typesField = depPkg.types || depPkg.typings;
    if (!typesField) continue;
    const typesFilePath = path.join(depDir, typesField);
    if (!ts.sys.fileExists(typesFilePath)) continue;
    const pkgName = depName.startsWith("@types/") ? depName.slice(7) : depName;
    rootTypeFiles.push({ pkgName, typesFilePath });
  }

  // If no package provides a types entry point, return an empty array.
  if (rootTypeFiles.length === 0) {
    return [];
  }

  // 4. Create a TS program using the type entry files as roots.
  const compilerOptions: ts.CompilerOptions = {
    allowJs: false,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    baseUrl: projectDir,
  };
  const program = ts.createProgram(
    rootTypeFiles.map((rtp) => rtp.typesFilePath),
    compilerOptions,
  );

  // 5. Recursively collect declaration files from each root.
  const collected = new Map<string, TypeFile>();

  function collectSourceFile(
    sf: ts.SourceFile,
    packageName?: string,
    parentPkgName?: string,
  ): void {
    if (collected.has(sf.fileName)) return;

    // Only include declaration files.
    if (sf.isDeclarationFile) {
      collected.set(sf.fileName, wrapIfNeeded(sf, packageName));
    }

    // Process triple‑slash reference directives.
    for (const ref of sf.referencedFiles) {
      const refPath = path.resolve(path.dirname(sf.fileName), ref.fileName);
      const refSource = program.getSourceFile(refPath);
      if (refSource) {
        collectSourceFile(refSource);
      }
    }

    // Also check for module imports (or exports) in the AST.
    ts.forEachChild(sf, (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const moduleName = node.moduleSpecifier.text;
          const resolved = ts.resolveModuleName(
            moduleName,
            sf.fileName,
            compilerOptions,
            ts.sys,
          );
          if (
            resolved.resolvedModule &&
            resolved.resolvedModule.resolvedFileName
          ) {
            const modSource = program.getSourceFile(
              resolved.resolvedModule.resolvedFileName,
            );
            if (modSource) {
              const modFileNameForImport =
                !parentPkgName ? undefined : (
                  parentPkgName +
                  modSource.fileName
                    .split(`${projectDir}/node_modules/${parentPkgName}`)[1]
                    ?.split(".d.ts")[0]
                );
              if (modSource.fileName.includes("prostgles-server")) {
                console.log(
                  projectDir,
                  modSource.fileName,
                  modFileNameForImport,
                );
              }
              collectSourceFile(modSource, modFileNameForImport, parentPkgName);
            }
          }
        }
      }
    });
  }

  // For each package's root type file, collect its source and any referenced files.
  for (const rootFile of rootTypeFiles) {
    const sf = program.getSourceFile(rootFile.typesFilePath);
    if (sf) {
      collectSourceFile(sf, rootFile.pkgName, rootFile.pkgName);
    }
  }

  return Array.from(collected.values());
}

function shouldWrapFile(sourceFile: ts.SourceFile): boolean {
  // If the file is already an external module, it has top-level imports/exports.
  // if (ts.isExternalModule(sourceFile)) {
  //   return false;
  // }

  // Optionally, check if the file already starts with a 'declare module' statement.
  const [firstStmt] = sourceFile.statements;
  if (firstStmt && ts.isModuleDeclaration(firstStmt)) {
    return false;
  }

  // Otherwise, it's ambient (global) and likely needs to be wrapped.
  return true;
}

function wrapIfNeeded(
  sourceFile: ts.SourceFile,
  packageName: string | undefined,
): { content: string; filePath: string } {
  const fileContent = sourceFile.getFullText();
  if (packageName && shouldWrapFile(sourceFile)) {
    return {
      filePath: sourceFile.fileName,
      content: `declare module '${packageName}' {\n${fileContent}\n}`,
    };
  } else {
    return {
      filePath: sourceFile.fileName,
      content: fileContent,
    };
  }
}
