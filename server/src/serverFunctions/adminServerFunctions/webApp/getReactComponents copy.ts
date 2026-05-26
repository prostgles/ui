import { join } from "path";
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

  const components: { name: string; propsType: ts.Type | undefined }[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    const filePath = sourceFile.fileName;
    if (!filePath.startsWith(componentsDir)) continue;

    ts.forEachChild(sourceFile, (node) => {
      if (!isExported(node)) return;

      const comp = getReactComponent(node, checker);
      if (comp) {
        components.push(comp);
      }
    });
  }

  const comps = components.map((c) => ({
    name: c.name,
    propsTypeString:
      c.propsType ? checker.typeToString(c.propsType) : undefined,
  }));
  // TODO: fix recursive types generation for func returns
  const renderTree = getReactRenderTree(program) as any;
  return { components: comps, renderTree };
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
  node: ts.ClassDeclaration,
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
