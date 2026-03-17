import ts from "typescript";
import { callWorkflowProxy } from "./callWorkflowProxy";
import { type DefineAgenticWorkflow } from "./defineAgenticWorkflow";

export const definitionHandler = async (
  definitions: Parameters<DefineAgenticWorkflow>[0],
) => {
  const usedTables = extractTableNames();
  await callWorkflowProxy({
    type: "definitions",
    definitions,
    usedTables,
  });
  console.log(
    "Definitions sent to MCP proxy, exiting due to MODE=definitions-only",
  );
  process.exit(0);
};
const dbTableMethods = new Set([
  "find",
  "findOne",
  "insert",
  "update",
  "delete",
  "count",
  "upsert",
  "findOneOrCreate",
]);

const extractTableNames = (): string[] => {
  const configPath = ts.findConfigFile(
    __dirname,
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (!configPath) throw new Error("tsconfig.json not found");

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    __dirname,
  );

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const sourceFile = program.getSourceFile(`${__dirname}/index.ts`);
  if (!sourceFile) throw new Error("index.ts not found");

  const checker = program.getTypeChecker();
  const tables: string[] = [];

  /**
   * Matches both:
   *   - `db.tableName.method()` where `db` is a destructured DbTableHandler
   *   - `databaseHandler.db.tableName.method()` where the parent is DatabaseHandler
   */
  const isDbTableHandlerExpr = (node: ts.Expression): boolean => {
    const type = checker.getTypeAtLocation(node);

    // Covers the destructured case: `const { db } = databaseHandler`
    if (type.aliasSymbol?.getName() === "DbTableHandler") return true;

    // Covers the direct property access case: `databaseHandler.db`
    if (ts.isPropertyAccessExpression(node) && node.name.text === "db") {
      const parentType = checker.getTypeAtLocation(node.expression);
      const parentSymbol = parentType.aliasSymbol ?? parentType.getSymbol();
      return parentSymbol?.getName() === "DatabaseHandler";
    }

    return false;
  };

  const visit = (node: ts.Node): void => {
    /**
     * Target AST shape:
     *   CallExpression
     *     PropertyAccessExpression          <- `.method()`
     *       PropertyAccessExpression        <- `.tableName`  ← extract this
     *         Expression (DbTableHandler)   <- `db`
     */
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (
        ts.isPropertyAccessExpression(expr) &&
        dbTableMethods.has(expr.name.text)
      ) {
        const tableAccess = expr.expression;
        if (
          ts.isPropertyAccessExpression(tableAccess) &&
          isDbTableHandlerExpr(tableAccess.expression)
        ) {
          tables.push(tableAccess.name.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return Array.from(new Set(tables));
};
