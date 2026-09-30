import path from "path";
import ts from "typescript";

export const schemaConfigSourceTypes = [
  "tableHooks",
  "function",
  "tableConfig",
  "tableOptions",
] as const;

type SchemaConfigSourceType = (typeof schemaConfigSourceTypes)[number];

type SchemaConfigSourcePosition = {
  fileName: string;
  startLineNumber: number;
  endLineNumber: number;
};

type ProjectContext = {
  checker: ts.TypeChecker;
  configExpression: ts.Expression | undefined;
};

const projectCache = new Map<
  string,
  { projectVersion: string; context: ProjectContext }
>();

export const findSchemaConfigSource = ({
  projectPath,
  type,
  name,
  projectVersion,
}: {
  projectPath: string;
  type: SchemaConfigSourceType;
  name: string;
  projectVersion?: string;
}): SchemaConfigSourcePosition | undefined => {
  const context = getProjectContext(path.resolve(projectPath), projectVersion);
  const { checker, configExpression } = context;
  if (!configExpression) return;

  const rootExpression =
    type === "tableOptions" ?
      getPropertyExpression(
        getPropertyExpression(configExpression, "connection", checker),
        "table_options",
        checker,
      )
    : getPropertyExpression(
        configExpression,
        type === "function" ? "functions" : type,
        checker,
      );
  if (!rootExpression) return;

  const node =
    type === "function" ?
      findFunction(rootExpression, name, checker, new Set())
    : findMapProperty(rootExpression, name, checker, new Set());
  if (!node) return;

  const sourceFile = node.getSourceFile();
  const start = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  const end = sourceFile.getLineAndCharacterOfPosition(
    Math.max(node.getStart(sourceFile), node.getEnd() - 1),
  );
  return {
    fileName: sourceFile.fileName,
    startLineNumber: start.line + 1,
    endLineNumber: end.line + 1,
  };
};

const getProjectContext = (
  projectPath: string,
  projectVersion: string | undefined,
): ProjectContext => {
  const cached = projectCache.get(projectPath);
  if (projectVersion && cached?.projectVersion === projectVersion) {
    return cached.context;
  }
  const configFileName = ts.findConfigFile(
    projectPath,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ts.sys.fileExists,
  );
  if (!configFileName) {
    throw new Error(`tsconfig.json not found in ${projectPath}`);
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
  if (configFile.error) throw new Error(formatDiagnostic(configFile.error));

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configFileName),
  );
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map(formatDiagnostic).join("\n"));
  }

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const configExpression = getConfigExpression(program, checker, projectPath);
  const context = { checker, configExpression };
  if (projectVersion) {
    projectCache.set(projectPath, { projectVersion, context });
  }
  return context;
};

const getConfigExpression = (
  program: ts.Program,
  checker: ts.TypeChecker,
  projectPath: string,
) => {
  const projectPrefix = path.resolve(projectPath) + path.sep;
  const entryPoints = [
    path.resolve(projectPath, "src", "index.ts"),
    path.resolve(projectPath, "index.ts"),
  ];
  const sourceFiles = program.getSourceFiles().toSorted((a, b) => {
    const aIndex = entryPoints.indexOf(path.resolve(a.fileName));
    const bIndex = entryPoints.indexOf(path.resolve(b.fileName));
    return (
      (aIndex < 0 ? entryPoints.length : aIndex) -
      (bIndex < 0 ? entryPoints.length : bIndex)
    );
  });
  for (const sourceFile of sourceFiles) {
    if (
      sourceFile.isDeclarationFile ||
      !path.resolve(sourceFile.fileName).startsWith(projectPrefix)
    ) {
      continue;
    }
    const defaultExport = sourceFile.statements.find(
      (node): node is ts.ExportAssignment =>
        ts.isExportAssignment(node) && !node.isExportEquals,
    );
    if (!defaultExport) continue;

    const expression = resolveExpression(
      defaultExport.expression,
      checker,
      new Set(),
    );
    if (!expression) continue;
    if (ts.isCallExpression(expression)) return expression.arguments[0];
    return expression;
  }
};

const getPropertyExpression = (
  expression: ts.Expression | undefined,
  name: string,
  checker: ts.TypeChecker,
): ts.Expression | undefined => {
  if (!expression) return;
  const resolved = resolveExpression(expression, checker, new Set());
  if (!resolved) return;
  if (ts.isCallExpression(resolved)) {
    return getPropertyExpression(resolved.arguments[0], name, checker);
  }
  if (!ts.isObjectLiteralExpression(resolved)) return;

  for (const property of [...resolved.properties].reverse()) {
    if (ts.isSpreadAssignment(property)) {
      const spreadResult = getPropertyExpression(
        property.expression,
        name,
        checker,
      );
      if (spreadResult) return spreadResult;
      continue;
    }
    if (getPropertyName(property.name, checker) !== name) continue;
    return getPropertyInitializer(property, checker);
  }
};

const findMapProperty = (
  expression: ts.Expression,
  name: string,
  checker: ts.TypeChecker,
  seen: Set<ts.Node>,
): ts.ObjectLiteralElementLike | undefined => {
  const resolved = resolveExpression(expression, checker, seen);
  if (!resolved || seen.has(resolved)) return;
  seen.add(resolved);

  if (ts.isCallExpression(resolved)) {
    const firstArgument = resolved.arguments[0];
    return firstArgument && findMapProperty(firstArgument, name, checker, seen);
  }
  if (!ts.isObjectLiteralExpression(resolved)) return;

  for (const property of [...resolved.properties].reverse()) {
    if (ts.isSpreadAssignment(property)) {
      const spreadResult = findMapProperty(
        property.expression,
        name,
        checker,
        seen,
      );
      if (spreadResult) return spreadResult;
      continue;
    }
    if (getPropertyName(property.name, checker) === name) return property;
  }
};

const findFunction = (
  expression: ts.Expression,
  name: string,
  checker: ts.TypeChecker,
  seen: Set<ts.Node>,
  isFunctionMap = false,
): ts.ObjectLiteralElementLike | undefined => {
  const resolved = resolveExpression(expression, checker, seen);
  if (!resolved || seen.has(resolved)) return;
  seen.add(resolved);

  if (ts.isCallExpression(resolved)) {
    if (getCalledName(resolved.expression) === "defineFunction") return;
    for (const argument of resolved.arguments) {
      const result = findFunction(argument, name, checker, seen, isFunctionMap);
      if (result) return result;
    }
    return;
  }
  if (!ts.isObjectLiteralExpression(resolved)) return;

  for (const property of [...resolved.properties].reverse()) {
    if (ts.isSpreadAssignment(property)) {
      const spreadResult = findFunction(
        property.expression,
        name,
        checker,
        seen,
        isFunctionMap,
      );
      if (spreadResult) return spreadResult;
      continue;
    }

    const propertyName = getPropertyName(property.name, checker);
    const initializer = getPropertyInitializer(property, checker);
    if (!initializer) continue;
    if (
      propertyName === name &&
      (isFunctionMap || isDefineFunction(initializer, checker))
    ) {
      return property;
    }
    if (propertyName === "functions") {
      const result = findFunction(initializer, name, checker, seen, true);
      if (result) return result;
      continue;
    }
    if (!isFunctionMap) {
      const result = findFunction(initializer, name, checker, seen);
      if (result) return result;
    }
  }
};

const isDefineFunction = (
  expression: ts.Expression,
  checker: ts.TypeChecker,
) => {
  const resolved = resolveExpression(expression, checker, new Set());
  return (
    !!resolved &&
    ts.isCallExpression(resolved) &&
    getCalledName(resolved.expression) === "defineFunction"
  );
};

const getCalledName = (expression: ts.LeftHandSideExpression) =>
  ts.isIdentifier(expression) ? expression.text
  : ts.isPropertyAccessExpression(expression) ? expression.name.text
  : undefined;

const resolveExpression = (
  expression: ts.Expression,
  checker: ts.TypeChecker,
  seen: Set<ts.Node>,
): ts.Expression | undefined => {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  if (!ts.isIdentifier(current) && !ts.isPropertyAccessExpression(current)) {
    return current;
  }
  if (seen.has(current)) return;
  seen.add(current);

  let symbol = checker.getSymbolAtLocation(current);
  if (!symbol) return current;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  for (const declaration of symbol.declarations ?? []) {
    const initializer = getDeclarationInitializer(declaration, checker);
    if (initializer) return resolveExpression(initializer, checker, seen);
  }
  return current;
};

const getDeclarationInitializer = (
  declaration: ts.Declaration,
  checker: ts.TypeChecker,
): ts.Expression | undefined => {
  if (
    ts.isVariableDeclaration(declaration) ||
    ts.isPropertyAssignment(declaration) ||
    ts.isBindingElement(declaration)
  ) {
    return declaration.initializer;
  }
  if (ts.isShorthandPropertyAssignment(declaration)) {
    let valueSymbol = checker.getShorthandAssignmentValueSymbol(declaration);
    if (valueSymbol?.flags && valueSymbol.flags & ts.SymbolFlags.Alias) {
      valueSymbol = checker.getAliasedSymbol(valueSymbol);
    }
    for (const valueDeclaration of valueSymbol?.declarations ?? []) {
      const initializer = getDeclarationInitializer(valueDeclaration, checker);
      if (initializer) return initializer;
    }
  }
  if (ts.isExportAssignment(declaration)) return declaration.expression;
};

const getPropertyInitializer = (
  property: ts.ObjectLiteralElementLike,
  checker: ts.TypeChecker,
): ts.Expression | undefined => {
  if (ts.isPropertyAssignment(property)) return property.initializer;
  if (ts.isShorthandPropertyAssignment(property)) {
    return getDeclarationInitializer(property, checker);
  }
};

const getPropertyName = (
  name: ts.PropertyName | undefined,
  checker: ts.TypeChecker,
): string | undefined => {
  if (!name) return;
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name)) {
    return getStaticString(name.expression, checker, new Set());
  }
};

const getStaticString = (
  expression: ts.Expression,
  checker: ts.TypeChecker,
  seen: Set<ts.Node>,
): string | undefined => {
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
    return expression.text;
  }
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      const spanValue = getStaticString(span.expression, checker, seen);
      if (spanValue === undefined) return;
      value += spanValue + span.literal.text;
    }
    return value;
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = getStaticString(expression.left, checker, seen);
    const right = getStaticString(expression.right, checker, seen);
    return left === undefined || right === undefined ? undefined : left + right;
  }
  if (seen.has(expression)) return;
  const resolved = resolveExpression(expression, checker, seen);
  if (!resolved || resolved === expression) return;
  return getStaticString(resolved, checker, seen);
};

const formatDiagnostic = (diagnostic: ts.Diagnostic) =>
  ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
