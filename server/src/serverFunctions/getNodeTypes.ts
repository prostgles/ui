import ts from "typescript";
import * as path from "path";

const toPosixPath = (p: string) => p.split(path.sep).join("/");

export const getNodeTypes = () => {
  const pathToProject = path.resolve(__dirname, "../../../..");
  const files = extractInstalledPackageTypes(pathToProject);
  return files;
};

type TypeFile = {
  content: string;
  filePath: string;
  // virtualPath: string;
};

/**
 * Extracts type definitions for installed packages as specified by their package.json
 * "types" (or "typings") field, including any referenced declaration files.
 *
 * @param projectDir - Absolute path to your project root.
 */
const extractInstalledPackageTypes = (projectDir: string): TypeFile[] => {
  // 1. Read the project's package.json.
  const projectPkgPath = path.join(projectDir, "package.json");
  if (!ts.sys.fileExists(projectPkgPath)) {
    throw new Error(`Cannot find project package.json at ${projectPkgPath}`);
  }
  const projectPkgContent = ts.sys.readFile(projectPkgPath);
  if (!projectPkgContent) {
    throw new Error(`Failed to read ${projectPkgPath}`);
  }
  let projectPkg:
    | undefined
    | {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
  try {
    projectPkg = JSON.parse(projectPkgContent);
  } catch (err) {
    throw new Error(`Failed to parse ${projectPkgPath}: ${err}`);
  }

  const depsToInclude = ["prostgles-types", "@types/node"];

  // 2. Gather dependency names from "dependencies" and "devDependencies".
  const deps = {
    ...(projectPkg?.dependencies || {}),
    /** Include node types */
    ...(projectPkg?.devDependencies || {}),
  };
  const toExclude = ["@aws-sdk", "@types/aws-sdk"]; //"prostgles-server",
  const depNames = new Set(
    Object.keys(deps).filter((depName) =>
      toExclude.every((excludedPkg) => !depName.includes(excludedPkg)),
    ),
  );
  depsToInclude.forEach((pkg) => {
    if (!depNames.has(pkg)) {
      depNames.add(pkg);
    }
  });

  // 3. For each dependency, locate its package.json and check for a "types" or "typings" field.
  const rootTypeFiles: {
    pkgName: string;
    typesFilePath: string;
    depPkgContent: string;
    depPkgPath: string;
  }[] = [];
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

    rootTypeFiles.push({ pkgName, typesFilePath, depPkgContent, depPkgPath });
  }

  // If no package provides a types entry point, return an empty array.
  if (rootTypeFiles.length === 0) {
    return [];
  }

  // 4. Create a TS program using the type entry files as roots.
  const compilerOptions: ts.CompilerOptions = {
    allowJs: false,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    baseUrl: projectDir,
  };
  const program = ts.createProgram(
    rootTypeFiles.map((rtp) => rtp.typesFilePath),
    compilerOptions,
  );

  // 5. Recursively collect declaration files from each root.
  const collected = new Map<string, TypeFile>();
  const nodeModulesRoot = path.resolve(projectDir, "node_modules");
  const isInsideNodeModules = (targetPath: string): boolean => {
    const rel = path.relative(nodeModulesRoot, targetPath);
    return !rel.startsWith("..") && !path.isAbsolute(rel);
  };
  function addNearestPackageJson(fileName: string) {
    let dir = path.dirname(fileName);

    while (isInsideNodeModules(dir)) {
      const pkgJsonPath = path.join(dir, "package.json");
      if (ts.sys.fileExists(pkgJsonPath)) {
        if (!collected.has(pkgJsonPath)) {
          const content = ts.sys.readFile(pkgJsonPath);
          if (content?.includes('"types"') || content?.includes('"typings"')) {
            collected.set(pkgJsonPath, {
              filePath: pkgJsonPath,
              content,
            });
          }
        }
        return; // stop at nearest package boundary
      }

      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  function collectSourceFile(
    sf: ts.SourceFile,
    packageName?: string,
    parentPkgName?: string,
  ): void {
    if (collected.has(sf.fileName)) return;
    addNearestPackageJson(sf.fileName);
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
                  (() => {
                    const pkgRoot = path.resolve(
                      projectDir,
                      "node_modules",
                      parentPkgName,
                    );
                    const relToPkg = path.relative(pkgRoot, modSource.fileName);

                    if (
                      relToPkg.startsWith("..") ||
                      path.isAbsolute(relToPkg)
                    ) {
                      return undefined;
                    }

                    return `${parentPkgName}/${toPosixPath(relToPkg).replace(
                      /\.d\.ts$/i,
                      "",
                    )}`;
                  })()
                );
              collectSourceFile(modSource, modFileNameForImport, parentPkgName);
            }
          }
        }
      }
    });
  }

  // For each package's root type file, collect its source and any referenced files.
  for (const {
    depPkgContent,
    depPkgPath,
    pkgName,
    typesFilePath,
  } of rootTypeFiles) {
    const sf = program.getSourceFile(typesFilePath);
    if (sf) {
      collectSourceFile(sf, pkgName, pkgName);
    }

    /** This is needed for monaco-editor to work out index.d.ts path */
    if (
      depPkgContent.includes('"types"') ||
      depPkgContent.includes('"typings"')
    ) {
      collected.set(depPkgPath, {
        filePath: depPkgPath,
        content: depPkgContent,
      });
    }
  }

  const result = Array.from(collected.values()).map((file) => ({
    ...file,
    filePath: "/" + toPosixPath(path.relative(projectDir, file.filePath)),
  }));
  return result;
};

function shouldWrapFile(sourceFile: ts.SourceFile): boolean {
  // If the file is already an external module, it has top-level imports/exports.
  if (ts.isExternalModule(sourceFile)) {
    return false;
  }

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
): TypeFile {
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
