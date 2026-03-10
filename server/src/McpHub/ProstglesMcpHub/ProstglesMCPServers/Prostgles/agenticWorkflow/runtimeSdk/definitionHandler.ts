import { callWorkflowProxy } from "./callWorkflowProxy";
import type { DefineAgenticWorkflow } from "./defineAgenticWorkflow";
import type { ProxyCallDataDefinitions } from "./defineAgenticWorkflowHandlers.types";
import ts from "typescript";

export const definitionHandler = async (
  definitions: Parameters<DefineAgenticWorkflow>[0],
) => {
  const createStatement =
    definitions.databaseAccessDefinitions?.mode === "custom" ?
      definitions.databaseAccessDefinitions.tableCreateStatements
    : undefined;

  const newTables: ProxyCallDataDefinitions["newTables"] = [];
  if (typeof createStatement === "string") {
    if (!createStatement.trim()) {
      throw new Error("tableCreateStatements is an empty string");
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const { parse } = (await import("pgsql-ast-parser")) as {
      parse: (sql: string) => any[];
    };
    const ast = parse(createStatement) as {
      type: string;
      name: { name: string; schema?: string };
      columns: {
        name: { name: string };
        dataType: { name: string };
        constraints?: { type: "primary key" | "not null" }[];
      }[];
      ifNotExists?: boolean;
    }[];

    for (const {
      type,
      name: { name: tableName, schema },
      ifNotExists,
      columns,
    } of ast) {
      if (type !== "create table") {
        throw new Error(
          "Only CREATE TABLE statements are allowed in tableCreateStatements",
        );
      }
      newTables.push({
        name: tableName,
        schema: schema,
        columns: columns,
        ifNotExists,
      });
    }
  }
  const usedTables = extractTableNames();
  await callWorkflowProxy({
    type: "definitions",
    definitions,
    newTables,
    usedTables,
  });
  console.log(
    "Definitions sent to MCP proxy, exiting due to MODE=definitions-only",
  );
  process.exit(0);
};

const dbMethods = new Set(["find", "insert", "update", "delete", "count"]);

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
  const sourceFile = program.getSourceFile(__dirname + "/index.ts");
  if (!sourceFile) {
    throw new Error("index.ts not found");
  }
  const checker = program.getTypeChecker();
  const tables: string[] = [];

  function isDatabaseHandler(node: ts.Expression): boolean {
    const type = checker.getTypeAtLocation(node);
    const symbol = type.aliasSymbol ?? type.getSymbol();
    return symbol?.getName() === "DatabaseHandler";
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const method = expr.name.text;

        if (dbMethods.has(method) && isDatabaseHandler(expr.expression)) {
          const arg0 = node.arguments[0];
          if (arg0 && ts.isStringLiteralLike(arg0)) {
            tables.push(arg0.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return Array.from(new Set(tables));
};
