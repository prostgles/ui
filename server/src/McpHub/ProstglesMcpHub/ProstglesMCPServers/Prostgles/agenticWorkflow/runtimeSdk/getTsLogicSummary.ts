import * as ts from "typescript";

// ─── Position ─────────────────────────────────────────────────────────────────

export type Position = {
  /** 1-indexed line number */
  line: number;
  /** 1-indexed column number */
  col: number;
};

// ─── Function registry ────────────────────────────────────────────────────────

export type FunctionRisk = "safe" | "warn" | "danger";

export type FunctionInfo = {
  /** Stable key — also used as `fnId` on call/await nodes */
  id: string;
  /** Human-readable callee label, e.g. `fetch`, `db.query` */
  label: string;
  risk: FunctionRisk;
  /** Short human-readable explanation of *why* this is risky */
  riskReason?: string;
  /** How many times this function is called in the summarised scope */
  callCount: number;
};

/** All functions encountered during traversal, keyed by their `id`. */
export type FunctionRegistry = Record<string, FunctionInfo>;

// ─── Risk classification ──────────────────────────────────────────────────────

type RiskRule = {
  pattern: RegExp;
  risk: FunctionRisk;
  reason: string;
};

/**
 * Ordered list of rules — first match wins.
 * Rules are matched against the full callee label (e.g. `"fs.writeFile"`).
 */
const RISK_RULES: RiskRule[] = [
  // ── Danger ───────────────────────────────────────────────────────────────
  {
    pattern: /\beval\b/,
    risk: "danger",
    reason: "eval() executes arbitrary code and is a common injection vector",
  },
  {
    pattern: /\b(execSync|spawnSync|exec|spawn|fork)\b/,
    risk: "danger",
    reason:
      "Spawns child processes; command-injection risk if inputs are unsanitised",
  },
  {
    pattern: /\b(unlink|rmdir|rm)\b/,
    risk: "danger",
    reason: "Permanently deletes files or directories",
  },
  {
    pattern: /\bwriteFile(Sync)?\b/,
    risk: "danger",
    reason: "Writes arbitrary data to the filesystem",
  },
  // ── Warn ─────────────────────────────────────────────────────────────────
  {
    pattern: /\bfetch\b/,
    risk: "warn",
    reason:
      "Makes an outbound HTTP request; review URL and credential handling",
  },
  {
    pattern: /\b(axios|got|request|http\.get|https\.get)\b/,
    risk: "warn",
    reason: "Outbound HTTP call; review URL source and authentication",
  },
  {
    pattern: /\breadFile(Sync)?\b/,
    risk: "warn",
    reason: "Reads from the filesystem; verify path is not user-controlled",
  },
  {
    pattern: /\b(readdir|glob|stat)\b/,
    risk: "warn",
    reason: "Filesystem enumeration; may expose directory structure",
  },
  {
    pattern: /\b(db|sql|pg|mysql|mongo|redis|prisma)\./i,
    risk: "warn",
    reason: "Database operation; verify inputs are sanitised / parameterised",
  },
  {
    pattern: /\brequire\b/,
    risk: "warn",
    reason:
      "Dynamic module load; ensure the module path is not user-controlled",
  },
];

const classifyRisk = (
  label: string,
): Pick<FunctionInfo, "risk" | "riskReason"> => {
  for (const rule of RISK_RULES) {
    if (rule.pattern.test(label)) {
      return { risk: rule.risk, reason: rule.reason } as Pick<
        FunctionInfo,
        "risk" | "riskReason"
      >;
    }
  }
  return { risk: "safe" };
};

// ─── Visitor context ──────────────────────────────────────────────────────────

type VisitorContext = {
  sf: ts.SourceFile;
  registry: FunctionRegistry;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type SummaryNode =
  | {
      kind: "await";
      label: string;
      /** Key into `SummaryResult.functions` */
      fnId: string;
      pos: Position;
      children?: SummaryNode[];
    }
  | {
      kind: "call";
      label: string;
      /** Key into `SummaryResult.functions` */
      fnId: string;
      pos: Position;
      children?: SummaryNode[];
    }
  | { kind: "assign"; name: string; value: SummaryNode; pos: Position }
  | { kind: "fn-def"; name: string; body: SummaryNode[]; pos: Position }
  | {
      kind: "if";
      condition: string;
      then: SummaryNode[];
      else?: SummaryNode[];
      pos: Position;
    }
  | { kind: "loop"; over: string; body: SummaryNode[]; pos: Position }
  | { kind: "return"; value?: string; pos: Position }
  | { kind: "block"; nodes: SummaryNode[]; pos: Position };

// ─── Public result type ───────────────────────────────────────────────────────

export type SummaryResult = {
  nodes: SummaryNode[];
  /** All functions encountered, keyed by their stable `fnId` */
  functions: FunctionRegistry;
};

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

// ─── Position helpers ─────────────────────────────────────────────────────────

const getPos = (node: ts.Node, sf: ts.SourceFile): Position => {
  const { line, character } = sf.getLineAndCharacterOfPosition(
    node.getStart(sf),
  );
  return { line: line + 1, col: character + 1 };
};

// ─── Function registry helpers ────────────────────────────────────────────────

/**
 * Derives a stable, normalised key from a callee label.
 * Strips argument lists so `fetch(url)` and `fetch(other)` share one entry.
 */
const toFnId = (label: string): string =>
  label
    .replace(/\(.*$/, "") // strip args
    .replace(/\s+/g, "") // strip whitespace
    .toLowerCase();

const registerCall = (label: string, registry: FunctionRegistry): string => {
  const id = toFnId(label);
  if (registry[id]) {
    registry[id].callCount += 1;
  } else {
    const { risk, riskReason } = classifyRisk(label);
    registry[id] = {
      id,
      label: label.replace(/\(.*$/, ""),
      risk,
      riskReason,
      callCount: 1,
    };
  }
  return id;
};

// ─── AST Visitor ──────────────────────────────────────────────────────────────

const extractCallbackChildren = (
  call: ts.CallExpression,
  ctx: VisitorContext,
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
        body: visitBlock(arg.body, ctx),
        pos: getPos(arg, ctx.sf),
      });
    }
  }
  return children.length > 0 ? children : undefined;
};

const extractValue = (
  expr: ts.Expression,
  ctx: VisitorContext,
): SummaryNode => {
  if (ts.isAwaitExpression(expr)) {
    const inner = expr.expression;
    if (ts.isCallExpression(inner)) {
      const label = callLabel(inner);
      const fnId = registerCall(label, ctx.registry);
      return {
        kind: "await",
        label,
        fnId,
        pos: getPos(expr, ctx.sf),
        children: extractCallbackChildren(inner, ctx),
      };
    }
    const label = truncate(shortExpr(inner));
    const fnId = registerCall(label, ctx.registry);
    return { kind: "await", label, fnId, pos: getPos(expr, ctx.sf) };
  }
  if (ts.isCallExpression(expr)) {
    const label = callLabel(expr);
    const fnId = registerCall(label, ctx.registry);
    return {
      kind: "call",
      label,
      fnId,
      pos: getPos(expr, ctx.sf),
      children: extractCallbackChildren(expr, ctx),
    };
  }
  // Non-call expression wrapped as a call node (e.g. bare identifier)
  const label = truncate(shortExpr(expr));
  const fnId = registerCall(label, ctx.registry);
  return { kind: "call", label, fnId, pos: getPos(expr, ctx.sf) };
};

const visitStatement = (
  stmt: ts.Statement,
  ctx: VisitorContext,
): SummaryNode | null => {
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
      return {
        kind: "fn-def",
        name,
        body: visitBlock(decl.initializer.body, ctx),
        pos: getPos(stmt, ctx.sf),
      };
    }

    return {
      kind: "assign",
      name,
      value: extractValue(decl.initializer, ctx),
      pos: getPos(stmt, ctx.sf),
    };
  }

  if (ts.isExpressionStatement(stmt)) return extractValue(stmt.expression, ctx);

  if (ts.isIfStatement(stmt)) {
    const condition = truncate(shortExpr(stmt.expression));
    const thenBlock =
      ts.isBlock(stmt.thenStatement) ?
        visitBlock(stmt.thenStatement, ctx)
      : ([visitStatement(stmt.thenStatement, ctx)].filter(
          Boolean,
        ) as SummaryNode[]);
    const elseBlock =
      stmt.elseStatement ?
        ts.isBlock(stmt.elseStatement) ?
          visitBlock(stmt.elseStatement, ctx)
        : ([visitStatement(stmt.elseStatement, ctx)].filter(
            Boolean,
          ) as SummaryNode[])
      : undefined;
    return {
      kind: "if",
      condition,
      then: thenBlock,
      else: elseBlock,
      pos: getPos(stmt, ctx.sf),
    };
  }

  if (ts.isReturnStatement(stmt)) {
    return {
      kind: "return",
      value: stmt.expression ? truncate(shortExpr(stmt.expression)) : undefined,
      pos: getPos(stmt, ctx.sf),
    };
  }

  if (ts.isForOfStatement(stmt) || ts.isForInStatement(stmt)) {
    const over = truncate(shortExpr(stmt.expression));
    const body =
      ts.isBlock(stmt.statement) ? visitBlock(stmt.statement, ctx) : [];
    return { kind: "loop", over, body, pos: getPos(stmt, ctx.sf) };
  }

  return null;
};

const visitBlock = (block: ts.Block, ctx: VisitorContext): SummaryNode[] =>
  block.statements
    .map((s) => visitStatement(s, ctx))
    .filter((n): n is SummaryNode => n !== null);

// ─── Source-file factory ──────────────────────────────────────────────────────

const makeSourceFile = (
  source: string,
  fileName = "workflow.ts",
): ts.SourceFile =>
  ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

const makeCtx = (sf: ts.SourceFile): VisitorContext => ({ sf, registry: {} });

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse and summarise the body of an async arrow/function expression.
 *
 * @example
 * const result = summariseWorkflowSource(`async ({ researcher }, db) => { ... }`);
 * console.log(result.nodes, result.functions);
 */
export const summariseWorkflowSource = (source: string): SummaryResult => {
  const wrapped = `const __fn = ${source};`;
  const sf = makeSourceFile(wrapped);
  const ctx = makeCtx(sf);

  const stmt = sf.statements[0];
  if (!stmt || !ts.isVariableStatement(stmt))
    return { nodes: [], functions: {} };
  const decl = stmt.declarationList.declarations[0];
  if (!decl?.initializer) return { nodes: [], functions: {} };
  const fn = decl.initializer;
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn))
    return { nodes: [], functions: {} };
  if (!ts.isBlock(fn.body)) return { nodes: [], functions: {} };

  const nodes = visitBlock(fn.body, ctx);
  return { nodes, functions: ctx.registry };
};

/**
 * Parse and summarise a block of TypeScript statements not wrapped in a function.
 */
export const summariseStatements = (source: string): SummaryResult => {
  const sf = makeSourceFile(source);
  const ctx = makeCtx(sf);
  const nodes = sf.statements
    .map((s) => visitStatement(s, ctx))
    .filter((n): n is SummaryNode => n !== null);
  return { nodes, functions: ctx.registry };
};

/**
 * Parses a full TypeScript file, finds `defineAgenticWorkflow(config, workflowFn)`,
 * and summarises the body of the workflow function (second argument).
 *
 * @example
 * const source = fs.readFileSync("my-workflow.ts", "utf8");
 * const { nodes, functions } = summariseWorkflowFile(source);
 * console.log(renderSummary(nodes));
 */
export const summariseWorkflowFile = (fileSource: string): SummaryResult => {
  const sf = makeSourceFile(fileSource);
  const ctx = makeCtx(sf);

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

  if (!workflowFn) return { nodes: [], functions: {} };
  const nodes = visitBlock(
    (workflowFn as ts.ArrowFunction).body as ts.Block,
    ctx,
  );
  return { nodes, functions: ctx.registry };
};

// ─── Structured text renderer ─────────────────────────────────────────────────

const INDENT = "  ";

const riskBadge = (risk: FunctionRisk): string => {
  switch (risk) {
    case "danger":
      return " ⛔";
    case "warn":
      return " ⚠️";
    case "safe":
      return "";
  }
};

export const renderSummaryNode = (
  node: SummaryNode,
  functions: FunctionRegistry,
  depth = 0,
): string => {
  const pad = INDENT.repeat(depth);
  const posHint = ` [${node.pos.line}:${node.pos.col}]`;

  switch (node.kind) {
    case "await": {
      const badge = riskBadge(functions[node.fnId]?.risk ?? "safe");
      return (
        `${pad}⏳ await ${node.label}${badge}${posHint}` +
        (node.children ?
          "\n" +
          node.children
            .map((c) => renderSummaryNode(c, functions, depth + 1))
            .join("\n")
        : "")
      );
    }
    case "call": {
      const badge = riskBadge(functions[node.fnId]?.risk ?? "safe");
      return (
        `${pad}▶ ${node.label}${badge}${posHint}` +
        (node.children ?
          "\n" +
          node.children
            .map((c) => renderSummaryNode(c, functions, depth + 1))
            .join("\n")
        : "")
      );
    }
    case "assign":
      return `${pad}📦 ${node.name}${posHint} = ${renderSummaryNode(node.value, functions, 0).trimStart()}`;
    case "fn-def":
      return (
        `${pad}🔧 define ${node.name}${posHint}:\n` +
        node.body
          .map((c) => renderSummaryNode(c, functions, depth + 1))
          .join("\n")
      );
    case "if":
      return (
        `${pad}🔀 if (${node.condition})${posHint}:\n` +
        node.then
          .map((c) => renderSummaryNode(c, functions, depth + 1))
          .join("\n") +
        (node.else ?
          `\n${pad}  else:\n` +
          node.else
            .map((c) => renderSummaryNode(c, functions, depth + 1))
            .join("\n")
        : "")
      );
    case "loop":
      return (
        `${pad}🔁 forEach ${node.over}${posHint}:\n` +
        node.body
          .map((c) => renderSummaryNode(c, functions, depth + 1))
          .join("\n")
      );
    case "return":
      return `${pad}↩ return${node.value ? ` ${node.value}` : ""}${posHint}`;
    case "block":
      return node.nodes
        .map((c) => renderSummaryNode(c, functions, depth))
        .join("\n");
  }
};

export const renderSummary = (result: SummaryResult, depth = 0): string =>
  result.nodes
    .map((n) => renderSummaryNode(n, result.functions, depth))
    .join("\n");

// ─── Compact one-liner renderer ───────────────────────────────────────────────

const walkCompact = (
  node: SummaryNode,
  functions: FunctionRegistry,
): string => {
  switch (node.kind) {
    case "await":
    case "call": {
      const badge = riskBadge(functions[node.fnId]?.risk ?? "safe");
      const inner =
        node.children?.length ?
          ` → [${node.children.map((c) => walkCompact(c, functions)).join(", ")}]`
        : "";
      return `${node.label}${badge}${inner}`;
    }
    case "assign":
      return `${node.name} = ${walkCompact(node.value, functions)}`;
    case "fn-def":
      return `${node.name} { ${node.body.map((c) => walkCompact(c, functions)).join("; ")} }`;
    case "if":
      return `if (${node.condition}) { ${node.then.map((c) => walkCompact(c, functions)).join("; ")} }`;
    case "loop":
      return `forEach(${node.over}) { ${node.body.map((c) => walkCompact(c, functions)).join("; ")} }`;
    case "return":
      return `return${node.value ? ` ${node.value}` : ""}`;
    case "block":
      return node.nodes.map((c) => walkCompact(c, functions)).join(" → ");
  }
};

/**
 * Render nodes as a single chained line:
 * `doResearch() → fetch(url) ⚠️ → if (x < 10) { … } → …`
 */
export const renderCompact = (result: SummaryResult): string =>
  result.nodes.map((n) => walkCompact(n, result.functions)).join(" → ");

// ─── Registry helpers (useful for React UIs) ──────────────────────────────────

/** Returns all functions with risk ≥ the given threshold, sorted by risk then label. */
export const filterByRisk = (
  registry: FunctionRegistry,
  minRisk: FunctionRisk = "warn",
): FunctionInfo[] => {
  const order: Record<FunctionRisk, number> = { danger: 2, warn: 1, safe: 0 };
  const threshold = order[minRisk];
  return Object.values(registry)
    .filter((f) => order[f.risk] >= threshold)
    .sort(
      (a, b) => order[b.risk] - order[a.risk] || a.label.localeCompare(b.label),
    );
};

/** Returns a deduplicated list of all risks present in a registry. */
export const highestRisk = (registry: FunctionRegistry): FunctionRisk => {
  const values = Object.values(registry);
  if (values.some((f) => f.risk === "danger")) return "danger";
  if (values.some((f) => f.risk === "warn")) return "warn";
  return "safe";
};
