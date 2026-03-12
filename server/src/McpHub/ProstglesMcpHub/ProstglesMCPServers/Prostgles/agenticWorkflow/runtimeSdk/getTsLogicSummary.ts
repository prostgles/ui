import * as ts from "typescript";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SummaryNode =
  | { kind: "await"; label: string; children?: SummaryNode[] }
  | { kind: "call"; label: string; children?: SummaryNode[] }
  | { kind: "assign"; name: string; value: SummaryNode }
  | { kind: "fn-def"; name: string; body: SummaryNode[] }
  | { kind: "if"; condition: string; then: SummaryNode[]; else?: SummaryNode[] }
  | { kind: "loop"; over: string; body: SummaryNode[] }
  | { kind: "return"; value?: string }
  | { kind: "block"; nodes: SummaryNode[] };

// ─── Expression helpers ───────────────────────────────────────────────────────

const truncate = (s: string, max = 60): string =>
  s.length > max ? s.slice(0, max - 1) + "…" : s;

const shortExpr = (node: ts.Node): string => {
  if (ts.isStringLiteral(node)) return JSON.stringify(node.text);
  if (ts.isNumericLiteral(node)) return node.text;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node))
    return `${shortExpr(node.expression)}.${node.name.text}`;
  if (ts.isCallExpression(node)) return `${shortExpr(node.expression)}(…)`;
  if (ts.isAwaitExpression(node)) return `await ${shortExpr(node.expression)}`;
  if (ts.isObjectLiteralExpression(node)) {
    const keys = node.properties
      .slice(0, 3)
      .map((p) => (ts.isPropertyAssignment(p) ? shortExpr(p.name) : "…"))
      .join(", ");
    return `{ ${keys}${node.properties.length > 3 ? ", …" : ""} }`;
  }
  if (ts.isArrayLiteralExpression(node))
    return `[${node.elements.length} item${node.elements.length !== 1 ? "s" : ""}]`;
  if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return "`…`";
  if (ts.isBinaryExpression(node))
    return `${shortExpr(node.left)} ${ts.tokenToString(node.operatorToken.kind)} ${shortExpr(node.right)}`;
  if (ts.isPrefixUnaryExpression(node))
    return (ts.tokenToString(node.operator) ?? "") + shortExpr(node.operand);
  return "…";
};

const callLabel = (node: ts.CallExpression): string => {
  const callee = shortExpr(node.expression);
  const args = node.arguments
    .slice(0, 3)
    .map((a) =>
      ts.isArrowFunction(a) || ts.isFunctionExpression(a) ? "…" : shortExpr(a),
    )
    .join(", ");
  return truncate(`${callee}(${args})`);
};

// ─── AST Visitor ──────────────────────────────────────────────────────────────

const extractCallbackChildren = (
  call: ts.CallExpression,
): SummaryNode[] | undefined => {
  const children: SummaryNode[] = [];
  for (const arg of call.arguments) {
    if (
      (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) &&
      ts.isBlock(arg.body)
    ) {
      const paramName =
        arg.parameters[0] && ts.isIdentifier(arg.parameters[0].name) ?
          arg.parameters[0].name.text
        : "…";
      children.push({
        kind: "fn-def",
        name: `(${paramName}) =>`,
        body: visitBlock(arg.body),
      });
    }
  }
  return children.length > 0 ? children : undefined;
};

const extractValue = (expr: ts.Expression): SummaryNode => {
  if (ts.isAwaitExpression(expr)) {
    const inner = expr.expression;
    if (ts.isCallExpression(inner))
      return {
        kind: "await",
        label: callLabel(inner),
        children: extractCallbackChildren(inner),
      };
    return { kind: "await", label: truncate(shortExpr(inner)) };
  }
  if (ts.isCallExpression(expr))
    return {
      kind: "call",
      label: callLabel(expr),
      children: extractCallbackChildren(expr),
    };
  return { kind: "call", label: truncate(shortExpr(expr)) };
};

const visitStatement = (stmt: ts.Statement): SummaryNode | null => {
  if (ts.isVariableStatement(stmt)) {
    const decls = stmt.declarationList.declarations;
    if (decls.length !== 1) return null;
    const decl = decls[0]!;
    if (!decl.initializer) return null;
    const name = ts.isIdentifier(decl.name) ? decl.name.text : "…";

    if (
      (ts.isArrowFunction(decl.initializer) ||
        ts.isFunctionExpression(decl.initializer)) &&
      ts.isBlock(decl.initializer.body)
    ) {
      return { kind: "fn-def", name, body: visitBlock(decl.initializer.body) };
    }

    return { kind: "assign", name, value: extractValue(decl.initializer) };
  }

  if (ts.isExpressionStatement(stmt)) return extractValue(stmt.expression);

  if (ts.isIfStatement(stmt)) {
    const condition = truncate(shortExpr(stmt.expression));
    const thenBlock =
      ts.isBlock(stmt.thenStatement) ?
        visitBlock(stmt.thenStatement)
      : ([visitStatement(stmt.thenStatement)].filter(Boolean) as SummaryNode[]);
    const elseBlock =
      stmt.elseStatement ?
        ts.isBlock(stmt.elseStatement) ?
          visitBlock(stmt.elseStatement)
        : ([visitStatement(stmt.elseStatement)].filter(
            Boolean,
          ) as SummaryNode[])
      : undefined;
    return { kind: "if", condition, then: thenBlock, else: elseBlock };
  }

  if (ts.isReturnStatement(stmt)) {
    return {
      kind: "return",
      value: stmt.expression ? truncate(shortExpr(stmt.expression)) : undefined,
    };
  }

  if (ts.isForOfStatement(stmt) || ts.isForInStatement(stmt)) {
    const over = truncate(shortExpr(stmt.expression));
    const body = ts.isBlock(stmt.statement) ? visitBlock(stmt.statement) : [];
    return { kind: "loop", over, body };
  }

  return null;
};

const visitBlock = (block: ts.Block): SummaryNode[] =>
  block.statements
    .map(visitStatement)
    .filter((n): n is SummaryNode => n !== null);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse and summarise the body of an async arrow/function expression.
 *
 * @example
 * summariseWorkflowSource(`async ({ researcher }, db) => { ... }`);
 */
export const summariseWorkflowSource = (source: string): SummaryNode[] => {
  const wrapped = `const __fn = ${source};`;
  const sf = ts.createSourceFile(
    "workflow.ts",
    wrapped,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const stmt = sf.statements[0];
  if (!stmt || !ts.isVariableStatement(stmt)) return [];
  const decl = stmt.declarationList.declarations[0];
  if (!decl?.initializer) return [];
  const fn = decl.initializer;
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return [];
  if (!ts.isBlock(fn.body)) return [];
  return visitBlock(fn.body);
};

/**
 * Parse and summarise a block of TypeScript statements not wrapped in a function.
 */
export const summariseStatements = (source: string): SummaryNode[] => {
  const sf = ts.createSourceFile(
    "workflow.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return sf.statements
    .map((s) => visitStatement(s))
    .filter((n): n is SummaryNode => n !== null);
};

// ─── Structured text renderer ─────────────────────────────────────────────────

const INDENT = "  ";

export const renderSummaryNode = (node: SummaryNode, depth = 0): string => {
  const pad = INDENT.repeat(depth);
  switch (node.kind) {
    case "await":
      return (
        `${pad}⏳ await ${node.label}` +
        (node.children ?
          "\n" +
          node.children.map((c) => renderSummaryNode(c, depth + 1)).join("\n")
        : "")
      );
    case "call":
      return (
        `${pad}▶ ${node.label}` +
        (node.children ?
          "\n" +
          node.children.map((c) => renderSummaryNode(c, depth + 1)).join("\n")
        : "")
      );
    case "assign":
      return `${pad}📦 ${node.name} = ${renderSummaryNode(node.value, 0).trimStart()}`;
    case "fn-def":
      return (
        `${pad}🔧 define ${node.name}:\n` +
        node.body.map((c) => renderSummaryNode(c, depth + 1)).join("\n")
      );
    case "if":
      return (
        `${pad}🔀 if (${node.condition}):\n` +
        node.then.map((c) => renderSummaryNode(c, depth + 1)).join("\n") +
        (node.else ?
          `\n${pad}  else:\n` +
          node.else.map((c) => renderSummaryNode(c, depth + 1)).join("\n")
        : "")
      );
    case "loop":
      return (
        `${pad}🔁 forEach ${node.over}:\n` +
        node.body.map((c) => renderSummaryNode(c, depth + 1)).join("\n")
      );
    case "return":
      return `${pad}↩ return${node.value ? ` ${node.value}` : ""}`;
    case "block":
      return node.nodes.map((c) => renderSummaryNode(c, depth)).join("\n");
  }
};

export const renderSummary = (nodes: SummaryNode[], depth = 0): string =>
  nodes.map((n) => renderSummaryNode(n, depth)).join("\n");

// ─── Compact one-liner renderer ───────────────────────────────────────────────

const walkCompact = (node: SummaryNode): string => {
  switch (node.kind) {
    case "await":
    case "call": {
      const inner =
        node.children?.length ?
          ` → [${node.children.map(walkCompact).join(", ")}]`
        : "";
      return `${node.label}${inner}`;
    }
    case "assign":
      return `${node.name} = ${walkCompact(node.value)}`;
    case "fn-def":
      return `${node.name} { ${node.body.map(walkCompact).join("; ")} }`;
    case "if":
      return `if (${node.condition}) { ${node.then.map(walkCompact).join("; ")} }`;
    case "loop":
      return `forEach(${node.over}) { ${node.body.map(walkCompact).join("; ")} }`;
    case "return":
      return `return${node.value ? ` ${node.value}` : ""}`;
    case "block":
      return node.nodes.map(walkCompact).join(" → ");
  }
};

/**
 * Render nodes as a single chained line:
 * `doResearch() → db.find({ … }) → if (x < 10) { doResearch() } → …`
 */
export const renderCompact = (nodes: SummaryNode[]): string =>
  nodes.map(walkCompact).join(" → ");

/**
 * Parses a full TypeScript file, finds the `defineAgenticWorkflow(config, workflowFn)`
 * call, and summarises the body of the workflow function (second argument).
 *
 * This is the main entry point for agentic workflow files.
 *
 * @example
 * const source = fs.readFileSync("my-workflow.ts", "utf8");
 * const nodes = summariseWorkflowFile(source);
 * console.log(renderSummary(nodes));
 */
export const summariseWorkflowFile = (fileSource: string): SummaryNode[] => {
  const sf = ts.createSourceFile(
    "workflow.ts",
    fileSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  let workflowFn = null as ts.ArrowFunction | ts.FunctionExpression | null;

  const find = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "defineAgenticWorkflow" &&
      node.arguments.length >= 2
    ) {
      const second = node.arguments[1]!;
      if (
        (ts.isArrowFunction(second) || ts.isFunctionExpression(second)) &&
        ts.isBlock(second.body)
      ) {
        workflowFn = second;
      }
    }
    ts.forEachChild(node, find);
  };

  find(sf);

  if (!workflowFn) return [];
  return visitBlock((workflowFn as ts.ArrowFunction).body as ts.Block);
};
