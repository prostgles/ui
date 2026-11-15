import ts from "typescript";
import type { ConfigModule } from "./getConfigModules";

export const getConfigAggregateErrors = (
  program: ts.Program,
  configModule: ConfigModule,
  modules: ConfigModule[],
): string[] => {
  if (configModule.entryName || !configModule.aggregateName) return [];

  const sourceFile = program.getSourceFile(configModule.fileName);
  const checker = program.getTypeChecker();
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  const exportSymbol =
    moduleSymbol &&
    checker
      .getExportsOfModule(moduleSymbol)
      .find((symbol) => symbol.name === configModule.exportName);
  const declaration = exportSymbol?.valueDeclaration;
  const initializer =
    declaration &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer;
  const configObject = initializer && unwrapExpression(initializer);
  if (!configObject || !ts.isObjectLiteralExpression(configObject)) {
    return [
      `Export "${configModule.exportName}" as an object mapping names to imports from matching *.${configModule.type}.ts files.`,
    ];
  }

  return configObject.properties.flatMap((property) => {
    const entryName =
      (
        property.name &&
        (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      ) ?
        property.name.text
      : undefined;
    const valueSymbol =
      ts.isShorthandPropertyAssignment(property) ?
        checker.getShorthandAssignmentValueSymbol(property)
      : (
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.initializer)
      ) ?
        checker.getSymbolAtLocation(property.initializer)
      : undefined;
    const importSpecifier = valueSymbol?.declarations?.find(
      ts.isImportSpecifier,
    );
    const importDeclaration = importSpecifier?.parent.parent.parent;
    const importedFile =
      importDeclaration &&
      checker
        .getSymbolAtLocation(importDeclaration.moduleSpecifier)
        ?.declarations?.find(ts.isSourceFile);
    const entryModule =
      importedFile &&
      modules.find(
        (candidate) =>
          candidate.fileName === importedFile.fileName &&
          candidate.type === configModule.type &&
          candidate.entryName === entryName,
      );
    if (
      entryModule &&
      (importSpecifier.propertyName ?? importSpecifier.name).text ===
        entryModule.exportName
    )
      return [];

    return [
      entryName ?
        `Entry "${entryName}" must reference the named export imported from ${entryName}.${configModule.type}.ts; define its config in that file.`
      : `Use explicit names and imported configs in ${configModule.aggregateName}.ts; spreads and computed keys are not supported.`,
    ];
  });
};

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  if (
    ts.isSatisfiesExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  )
    return unwrapExpression(expression.expression);
  return expression;
};
