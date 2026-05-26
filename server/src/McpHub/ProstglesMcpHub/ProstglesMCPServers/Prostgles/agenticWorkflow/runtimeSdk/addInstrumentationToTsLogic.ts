import * as ts from "typescript";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepKind = "await" | "await-assign" | "if" | "loop" | "fn-enter";

export interface StepMeta {
  line?: number;
  kind?: StepKind;
}

/**
 * The signature your runtime `__step` function must match.
 * Receives a human-readable label and optional metadata.
 */
export type StepFn = (label: string, meta?: StepMeta) => Promise<void>;

export interface InstrumentOptions {
  /**
   * Name of the step function injected into the workflow.
   * Defaults to `"__step"`. Must be in scope when the instrumented file runs.
   */
  stepFnName?: string;
  /**
   * Optional source code to prepend to the instrumented file.
   * Use this to inject a `__step` implementation directly, e.g. a console logger.
   *
   * @example
   * preamble: `const __step: StepFn = async (label, meta) => { console.log("[step]", label, meta); };`
   */
  preamble?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncate = (s: string, max = 50): string =>
  s.length > max ? s.slice(0, max - 1) + "..." : s;

const shortExpr = (node: ts.Node): string => {
  if (ts.isStringLiteral(node)) return JSON.stringify(node.text);
  if (ts.isNumericLiteral(node)) return node.text;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node))
    return `${shortExpr(node.expression)}.${node.name.text}`;
  if (ts.isCallExpression(node)) return `${shortExpr(node.expression)}(...)`;
  if (ts.isAwaitExpression(node)) return shortExpr(node.expression);
  if (ts.isObjectLiteralExpression(node)) {
    const keys = node.properties
      .slice(0, 2)
      .map((p) => (ts.isPropertyAssignment(p) ? shortExpr(p.name) : "..."))
      .join(", ");
    return `{ ${keys}${node.properties.length > 2 ? ", ..." : ""} }`;
  }
  if (ts.isArrayLiteralExpression(node))
    return `[${node.elements.length} item${node.elements.length !== 1 ? "s" : ""}]`;
  if (ts.isBinaryExpression(node))
    return `${shortExpr(node.left)} ${ts.tokenToString(node.operatorToken.kind)} ${shortExpr(node.right)}`;
  if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return "`...`";
  return "...";
};

// ─── AST factory helpers ──────────────────────────────────────────────────────

const { factory } = ts;

const makeStepCall = (
  label: string,
  stepFnName: string,
  meta?: StepMeta,
): ts.ExpressionStatement => {
  const metaProps: ts.ObjectLiteralElementLike[] = [];
  if (meta?.line != null)
    metaProps.push(
      factory.createPropertyAssignment(
        "line",
        factory.createNumericLiteral(meta.line),
      ),
    );
  if (meta?.kind != null)
    metaProps.push(
      factory.createPropertyAssignment(
        "kind",
        factory.createStringLiteral(meta.kind),
      ),
    );

  const args: ts.Expression[] = [factory.createStringLiteral(truncate(label))];
  if (metaProps.length > 0)
    args.push(factory.createObjectLiteralExpression(metaProps));

  return factory.createExpressionStatement(
    factory.createAwaitExpression(
      factory.createCallExpression(
        factory.createIdentifier(stepFnName),
        undefined,
        args,
      ),
    ),
  );
};

// ─── Transformer: inject __step before key statements ─────────────────────────

const makeInstrumentTransformer =
  (
    sf: ts.SourceFile,
    stepFnName: string,
  ): ts.TransformerFactory<ts.SourceFile> =>
  (context) =>
  (rootNode) => {
    let insideAsync = 0;

    const getLine = (node: ts.Node): number =>
      sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

    const instrumentBlock = (block: ts.Block): ts.Block => {
      const newStmts: ts.Statement[] = [];

      for (const stmt of block.statements) {
        // const x = await callee(...)
        if (ts.isVariableStatement(stmt)) {
          const decl = stmt.declarationList.declarations[0];
          if (decl?.initializer && ts.isAwaitExpression(decl.initializer)) {
            const name = ts.isIdentifier(decl.name) ? decl.name.text : "...";
            const callee = shortExpr(decl.initializer.expression);
            newStmts.push(
              makeStepCall(`${name} = await ${callee}`, stepFnName, {
                line: getLine(stmt),
                kind: "await-assign",
              }),
            );
          }
        }

        // await callee(...) standalone
        if (
          ts.isExpressionStatement(stmt) &&
          ts.isAwaitExpression(stmt.expression)
        ) {
          const callee = shortExpr(stmt.expression.expression);
          newStmts.push(
            makeStepCall(`await ${callee}`, stepFnName, {
              line: getLine(stmt),
              kind: "await",
            }),
          );
        }

        // if (condition)
        if (ts.isIfStatement(stmt)) {
          newStmts.push(
            makeStepCall(
              `if (${truncate(shortExpr(stmt.expression), 40)})`,
              stepFnName,
              { line: getLine(stmt), kind: "if" },
            ),
          );
        }

        // for...of / for...in
        if (ts.isForOfStatement(stmt) || ts.isForInStatement(stmt)) {
          newStmts.push(
            makeStepCall(
              `forEach ${truncate(shortExpr(stmt.expression), 40)}`,
              stepFnName,
              { line: getLine(stmt), kind: "loop" },
            ),
          );
        }

        newStmts.push(ts.visitEachChild(stmt, visit, context));
      }

      return factory.updateBlock(block, newStmts);
    };

    const visit = (node: ts.Node): ts.Node => {
      const isAsyncFn =
        (ts.isArrowFunction(node) ||
          ts.isFunctionExpression(node) ||
          ts.isFunctionDeclaration(node)) &&
        (node as ts.FunctionLikeDeclaration).modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
        );

      if (isAsyncFn) {
        insideAsync++;
        const updated = ts.visitEachChild(node, visit, context);
        insideAsync--;
        return updated;
      }

      if (ts.isBlock(node) && insideAsync > 0) {
        return instrumentBlock(node);
      }

      return ts.visitEachChild(node, visit, context);
    };

    return ts.visitNode(rootNode, visit) as ts.SourceFile;
  };

// ─── Transformer: inject "enter <fnName>" at top of named async arrow fns ────

const makeEnterFnTransformer =
  (stepFnName: string): ts.TransformerFactory<ts.SourceFile> =>
  (context) =>
  (rootNode) => {
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isVariableStatement(node)) {
        const decl = node.declarationList.declarations[0];
        if (
          decl &&
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer)) &&
          ts.isBlock(decl.initializer.body) &&
          decl.initializer.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
          )
        ) {
          const fnName = decl.name.text;
          const enterStmt = makeStepCall(`enter ${fnName}`, stepFnName, {
            kind: "fn-enter",
          });
          const oldBody = decl.initializer.body;
          const newBody = factory.updateBlock(oldBody, [
            enterStmt,
            ...oldBody.statements,
          ]);

          const newInit =
            ts.isArrowFunction(decl.initializer) ?
              factory.updateArrowFunction(
                decl.initializer,
                decl.initializer.modifiers,
                decl.initializer.typeParameters,
                decl.initializer.parameters,
                decl.initializer.type,
                decl.initializer.equalsGreaterThanToken,
                newBody,
              )
            : factory.updateFunctionExpression(
                decl.initializer,
                decl.initializer.modifiers,
                decl.initializer.asteriskToken,
                decl.initializer.name,
                decl.initializer.typeParameters,
                decl.initializer.parameters,
                decl.initializer.type,
                newBody,
              );

          const newDecl = factory.updateVariableDeclaration(
            decl,
            decl.name,
            decl.exclamationToken,
            decl.type,
            newInit,
          );

          return factory.updateVariableStatement(
            node,
            node.modifiers,
            factory.updateVariableDeclarationList(node.declarationList, [
              newDecl,
            ]),
          );
        }
      }

      return ts.visitEachChild(node, visit, context);
    };

    return ts.visitNode(rootNode, visit) as ts.SourceFile;
  };

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Instruments a full workflow TypeScript file by injecting `await __step(label, meta)`
 * calls before every meaningful step in the workflow function body.
 *
 * Instrumented points:
 *  - `const x = await callee(...)` → logged before the await
 *  - `await callee(...)` (standalone) → logged before the await
 *  - `if (condition)` → logged before the branch
 *  - `for...of` / `forEach` loops → logged before iteration
 *  - Entry of named async sub-functions (`const doX = async () => {...}`)
 *
 * The `stepFnName` function must be in scope when the instrumented file runs.
 * Use the `preamble` option to inject an implementation, or set it as a global
 * before executing (e.g. `globalThis.__step = myLogger`).
 *
 * @example — inject a console logger
 * ```ts
 * const instrumented = instrumentWorkflowFile(source, {
 *   preamble: `const __step = async (label, meta) => {
 *     console.log(\`[step:\${meta?.kind}] \${label}\`, meta?.line ? \`(line \${meta.line})\` : "");
 *   };`,
 * });
 * ```
 *
 * @example — send steps to a websocket for real-time UI updates
 * ```ts
 * const instrumented = instrumentWorkflowFile(source, {
 *   preamble: `const __step = async (label, meta) => {
 *     await fetch("/api/workflow-step", {
 *       method: "POST",
 *       body: JSON.stringify({ label, ...meta }),
 *     });
 *   };`,
 * });
 * ```
 */
export const instrumentWorkflowFile = (
  fileSource: string,
  options: InstrumentOptions = {},
): string => {
  const { stepFnName = "__step", preamble } = options;

  const sf = ts.createSourceFile(
    "workflow.ts",
    fileSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const result = ts.transform(sf, [
    makeInstrumentTransformer(sf, stepFnName),
    makeEnterFnTransformer(stepFnName),
  ]);

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const instrumented = printer.printFile(result.transformed[0]!);

  return preamble ? `${preamble}\n\n${instrumented}` : instrumented;
};

/**
 * Convenience: returns a default console-logging preamble you can pass directly.
 */
export const consoleStepLogger = (stepFnName = "__step"): string =>
  `const ${stepFnName} = async (label: string, meta?: { line?: number; kind?: string }) => {
  const loc = meta?.line ? \` (line \${meta.line})\` : "";
  console.log(\`[workflow:\${meta?.kind ?? "step"}]\${loc} \${label}\`);
};`;
