import { join, relative } from "path";
import { isDefined } from "prostgles-types";
import ts from "typescript";
import { getReactRenderTree } from "./getReactRenderTree";

export const getReactComponents = ({
  web_app_directory,
}: {
  web_app_directory: string;
}) => {
  const projectRoot = join(web_app_directory, "client");
  const componentsDir = join(projectRoot, "src", "components");

  const configPath = ts.findConfigFile(
    projectRoot,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ts.sys.fileExists,
    "tsconfig.app.json",
  );
  if (!configPath) throw new Error("tsconfig.json not found");

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    projectRoot,
  );

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();

  const componentsMap = new Map<
    string,
    { name: string; propsType: ts.Type | undefined; filePath: string }
  >();

  for (const sourceFile of program.getSourceFiles()) {
    const filePath = sourceFile.fileName;
    if (!filePath.startsWith(componentsDir)) continue;

    ts.forEachChild(sourceFile, (node) => {
      const filePath = relative(projectRoot, sourceFile.fileName);
      // Check for regular exports
      if (isExported(node)) {
        const comp = getReactComponent(node, checker);
        if (comp) {
          componentsMap.set(comp.name, { ...comp, filePath });
        }
      }

      // Check for default exports
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        const comp = getReactComponentFromDefaultExport(
          node,
          checker,
          sourceFile,
        );
        if (comp) {
          componentsMap.set(comp.name, { ...comp, filePath });
        }
      }
    });
  }

  const comps = Array.from(componentsMap.values()).map((c) => ({
    filePath: c.filePath,
    name: c.name,
    propsTypeString:
      c.propsType ? checker.typeToString(c.propsType) : undefined,
  }));

  // TODO: fix recursive types generation for func returns
  const renderTree = getReactRenderTree(program) as {
    componentName: string;
    outputTree: {
      name: string;
      children: any[];
      condition?: string;
      outputTree?: any[];
    }[];
  }[];
  return { components: comps, renderTree };
};

const getReactComponentFromDefaultExport = (
  node: ts.ExportAssignment,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
):
  | undefined
  | {
      name: string;
      propsType: ts.Type | undefined;
    } => {
  const expression = node.expression;

  // Handle: export default MyComponent
  if (ts.isIdentifier(expression)) {
    const symbol = checker.getSymbolAtLocation(expression);
    if (!symbol) return undefined;

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) return undefined;

    for (const decl of declarations) {
      const comp = getReactComponent(decl, checker);
      if (comp) {
        return comp;
      }
    }
  }

  // Handle: export default function MyComponent() { ... }
  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
    if (returnsJSX(expression)) {
      // Use filename as component name for anonymous default exports
      const fileName =
        sourceFile.fileName
          .split("/")
          .pop()
          ?.replace(/\.(tsx?|jsx?)$/, "") || "DefaultExport";
      const componentName = expression.name?.text || fileName;
      return {
        name: componentName,
        propsType: getPropsTypeFromFunction(checker, expression),
      };
    }
  }

  // Handle: export default class MyComponent extends React.Component
  if (ts.isClassExpression(expression)) {
    const heritage = expression.heritageClauses?.flatMap((h) => h.types) || [];
    const isReactComponent = heritage.some(
      (h) =>
        h.expression.getText().includes("React.Component") ||
        h.expression.getText().includes("Component"),
    );
    if (isReactComponent) {
      const fileName =
        sourceFile.fileName
          .split("/")
          .pop()
          ?.replace(/\.(tsx?|jsx?)$/, "") || "DefaultExport";
      const componentName = expression.name?.text || fileName;
      return {
        name: componentName,
        propsType: getPropsTypeFromClass(checker, expression),
      };
    }
  }

  return undefined;
};

const getReactComponent = (
  node: ts.Node,
  checker: ts.TypeChecker,
):
  | undefined
  | {
      name: string;
      propsType: ts.Type | undefined;
    } => {
  if (ts.isClassDeclaration(node)) {
    const name = node.name?.text;
    if (!name) return undefined;
    const heritage = node.heritageClauses?.flatMap((h) => h.types) || [];
    const isClass = heritage.some(
      (h) =>
        h.expression.getText().includes("React.Component") ||
        h.expression.getText().includes("Component"),
    );
    if (!isClass) {
      return;
    }
    return { name, propsType: getPropsTypeFromClass(checker, node) };
  }

  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
    const name = node.name?.text;
    if (name && returnsJSX(node)) {
      return {
        name,
        propsType: getPropsTypeFromFunction(checker, node),
      };
    }
  }

  if (ts.isVariableStatement(node)) {
    const firstMatch = node.declarationList.declarations
      .map((decl) => {
        if (!decl.initializer) return;
        if (!ts.isIdentifier(decl.name)) return;
        const init = decl.initializer;
        if (
          (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
          returnsJSX(init)
        ) {
          return {
            decl,
            name: decl.name.text,
            init,
          };
        }
      })
      .find(isDefined);
    if (firstMatch) {
      return {
        name: firstMatch.name,
        propsType: getPropsTypeFromVariable(checker, firstMatch.decl),
      };
    }
  }
};

const getPropsTypeFromClass = (
  checker: ts.TypeChecker,
  node: ts.ClassDeclaration | ts.ClassExpression,
): ts.Type | undefined => {
  const heritage = node.heritageClauses?.flatMap((h) => h.types) || [];
  for (const h of heritage) {
    const [typeArg] = h.typeArguments ?? [];
    if (typeArg) {
      return checker.getTypeAtLocation(typeArg);
    }
  }
  return undefined;
};

const getPropsTypeFromFunction = (
  checker: ts.TypeChecker,
  fn: ts.FunctionLikeDeclaration,
): ts.Type | undefined => {
  const [firstParam] = fn.parameters;
  if (!firstParam) {
    return undefined;
  }
  return checker.getTypeAtLocation(firstParam);
};

const getPropsTypeFromVariable = (
  checker: ts.TypeChecker,
  decl: ts.VariableDeclaration,
): ts.Type | undefined => {
  const init = decl.initializer;
  if (!init) return undefined;

  if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
    return getPropsTypeFromFunction(checker, init);
  }

  // React.FC<Props> style
  if (decl.type && ts.isTypeReferenceNode(decl.type)) {
    const [typeArg] = decl.type.typeArguments || [];
    if (typeArg) {
      return checker.getTypeAtLocation(typeArg);
    }
  }

  return undefined;
};

const isExported = (node: ts.Node): boolean => {
  return (
    (ts.getCombinedModifierFlags(node as ts.Declaration) &
      ts.ModifierFlags.Export) !==
    0
  );
};

const returnsJSX = (node: ts.Node): boolean => {
  let found = false;
  function walk(n: ts.Node) {
    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, walk);
  }
  ts.forEachChild(node, walk);
  return found;
};
