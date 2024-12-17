import ts from "typescript";
import * as path from "path";
import * as fs from "fs";

/**
 * Scans a React project to find all raw text nodes in JSX and logs their file locations.
 * @param projectPath - Path to the React project (e.g., src folder or tsconfig.json location).
 */
export const findRawTextInJSX = (filePath: string) => {
  const absolutePath = path.resolve(filePath);

  const configPath = ts.findConfigFile(
    path.dirname(absolutePath),
    ts.sys.fileExists,
    "tsconfig.json",
  );

  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  const program = ts.createProgram({
    rootNames: [absolutePath],
    options: parsedConfig.options,
  });

  const tsxFiles = program
    .getSourceFiles()
    .filter(
      (f) =>
        !f.fileName.includes("node_modules") && f.fileName.endsWith(".tsx"),
    );

  // const checker = program.getTypeChecker();
  tsxFiles.forEach((sourceFile) => {
    ts.forEachChild(sourceFile, function visit(node) {
      // Look for JSXText directly in JSX
      if (ts.isJsxText(node)) {
        if (shouldExcludeNode(node)) return;
        const rawText = node.getText(sourceFile).trim();
        if (rawText) {
          logResult(sourceFile, node, rawText);
        }
      }

      //  Look for string literals in JSX expressions
      if (ts.isJsxExpression(node) && node.expression) {
        if (shouldExcludeNode(node)) return;
        if (ts.isStringLiteral(node.expression)) {
          logResult(sourceFile, node.expression, node.expression.text);
        }
      }

      ts.forEachChild(node, visit);
    });
  });
  const resultPath = path.resolve(
    __dirname,
    "../.././../../client/src/i18n/translations/translateableComponents.json",
  );
  // console.log(resultPath);
  // console.log(translateableComponents);
  fs.writeFileSync(
    resultPath,
    JSON.stringify(translateableComponents, null, 2),
  );
};

/**
 * Logs the result with file path, line, and text content.
 */
const translateableComponents: Record<
  string,
  Record<string, { en: string; es: string }>
> = {};
function logResult(sourceFile: ts.SourceFile, node: ts.Node, text: string) {
  // try {
  //   const { line, character } = sourceFile.getLineAndCharacterOfPosition(
  //     node.getStart(),
  //   );
  // } catch (e) {
  //   console.error(node.getSourceFile());
  //   return;
  // }

  // TODO exclude className and other attributes
  if (text.includes("bb font-16 min-w-0")) {
    // const type1 = checker.getTypeAtLocation(node.type) ;
    console.log(ts, isJsxPropArgument(node));
    debugger;
  }
  const fileName = sourceFile.fileName.split("/").at(-1)?.split(".")[0];
  const textHasAlphabticChars = text.match(/[a-zA-Z]/);

  if (textHasAlphabticChars && fileName) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    translateableComponents[fileName] ??= {};
    const camelCaseKey = toCamelCase(text);
    //@ts-ignore
    translateableComponents[fileName][camelCaseKey] = {
      en: text,
      es: "",
    };
  }
}

/**
 * Determines whether a node should be excluded (e.g., part of a JSX attribute).
 * node - The current AST node.
 */
function shouldExcludeNode(node: ts.Node): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  // if (!node.getSourceFile()) return true;
  const parent = node.parent;
  // Exclude nodes that are part of JSX attributes (e.g., className="example")
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (parent && ts.isJsxAttribute(parent)) {
    return true;
  }
  return false;
}

function isJsxPropArgument(node: ts.Node): boolean {
  // Check if the parent is a JSX attribute
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!node.parent || !ts.isJsxAttribute(node.parent)) {
    return false;
  }

  // For cases like className={"myClass"}
  if (ts.isStringLiteral(node)) {
    return true;
  }

  // For cases where the value is in a JSX expression
  if (
    //@ts-ignore
    ts.isJsxExpression(node.parent.initializer) &&
    node.parent.initializer.expression === node
  ) {
    return true;
  }

  return false;
}
function toCamelCase(text: string): string {
  return (
    text
      // Remove all non-alphanumeric characters except spaces
      .replace(/[^a-zA-Z0-9 ]/g, "")
      // Split the string into words
      .split(" ")
      //  Convert to camelCase
      .map((word, index) => {
        const lowerCaseWord = word.toLowerCase();
        if (index === 0) {
          return lowerCaseWord; // First word stays lowercase
        }
        // Capitalize subsequent words
        return lowerCaseWord.charAt(0).toUpperCase() + lowerCaseWord.slice(1);
      })
      .join("")
  );
}

// setTimeout(() => {
//   const projectPath = process.cwd() + "/../client/src/index.tsx"; // Adjust to point to your React project's src directory or tsconfig.json
//   findRawTextInJSX(projectPath);
// }, 2222);
console.error("REMOVE".repeat(12));
