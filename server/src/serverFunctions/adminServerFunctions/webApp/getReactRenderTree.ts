//@ts-no-check
import ts from "typescript";
type RootRenderTree = {
  name: string;
  children: RootRenderTree[];
};

export type RenderTree = {
  componentName: string;
  outputTree: (RootRenderTree & { condition?: string })[];
};
type ReturnBranch = { jsx: ts.JsxChild; condition?: string };

export const getReactRenderTree = (program: ts.Program): RenderTree[] => {
  const results: RenderTree[] = [];

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || sf.fileName.includes("node_modules")) continue;

    ts.forEachChild(sf, (node) => {
      const tree = buildComponentTree(node);
      if (tree) results.push(tree);
    });
  }

  return results;

  // ---------------- helpers ----------------

  function buildComponentTree(node: ts.Node): RenderTree | undefined {
    const name = getComponentName(node);
    if (!name) return;

    const branches = getReturnedJsx(node);
    if (!branches.length) return;

    const outputTree: (RootRenderTree & { condition?: string })[] = [];

    for (const b of branches) {
      const trees = jsxToTree(b.jsx);
      trees.forEach((t) => outputTree.push({ ...t, condition: b.condition }));
    }

    return { componentName: name, outputTree };
  }

  function getComponentName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
    if (ts.isClassDeclaration(node) && node.name) return node.name.text;

    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (decl && ts.isIdentifier(decl.name)) return decl.name.text;
    }
    return;
  }

  function unwrap(expr: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
    return expr;
  }

  function isJsx(
    expr: ts.Expression,
  ): expr is ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment {
    return (
      ts.isJsxElement(expr) ||
      ts.isJsxSelfClosingElement(expr) ||
      ts.isJsxFragment(expr)
    );
  }

  function getReturnedJsx(node: ts.Node): ReturnBranch[] {
    const branches: ReturnBranch[] = [];

    // handle arrow functions with implicit return
    if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      const expr = unwrap(node.body);
      if (isJsx(expr)) branches.push({ jsx: expr });
      return branches;
    }

    // handle class component render() method
    if (ts.isClassDeclaration(node)) {
      const renderMethod = node.members.find(
        (m) =>
          ts.isMethodDeclaration(m) &&
          ts.isIdentifier(m.name) &&
          m.name.text === "render",
      ) as ts.MethodDeclaration | undefined;

      if (renderMethod) return getReturnedJsx(renderMethod);
    }

    // handle functions / blocks
    function visit(n: ts.Node, cond?: string) {
      if (ts.isIfStatement(n)) {
        const condition = n.expression.getText();
        visit(n.thenStatement, mergeCond(cond, condition));
        if (n.elseStatement)
          visit(n.elseStatement, mergeCond(cond, `!(${condition})`));
        return;
      }

      if (ts.isReturnStatement(n) && n.expression) {
        const expr = unwrap(n.expression);
        if (isJsx(expr)) branches.push({ jsx: expr, condition: cond });
        return;
      }

      ts.forEachChild(n, (child) => visit(child, cond));
    }

    visit(node);
    return branches;
  }

  function mergeCond(a?: string, b?: string) {
    if (a && b) return `${a} && ${b}`;
    return a || b;
  }

  function jsxToTree(
    node: ts.JsxChild,
  ): (RootRenderTree & { condition?: string })[] {
    const out: (RootRenderTree & { condition?: string })[] = [];

    if (ts.isJsxElement(node)) {
      out.push({
        name: node.openingElement.tagName.getText(),
        children: flattenChildren(node.children),
      });
    } else if (ts.isJsxSelfClosingElement(node)) {
      out.push({ name: node.tagName.getText(), children: [] });
    } else if (ts.isJsxFragment(node)) {
      return flattenChildren(node.children);
    } else if (ts.isJsxExpression(node) && node.expression) {
      const expr = node.expression;

      // ternary
      if (ts.isConditionalExpression(expr)) {
        const cond = expr.condition.getText();
        const whenTrue = unwrap(expr.whenTrue);
        const whenFalse = unwrap(expr.whenFalse);

        if (isJsx(whenTrue)) {
          const t = jsxToTree(whenTrue)[0];
          out.push({ ...t!, condition: cond });
        }
        if (isJsx(whenFalse)) {
          const t = jsxToTree(whenFalse)[0];
          out.push({ ...t!, condition: `!(${cond})` });
        }
      }

      // && short-circuit
      if (
        ts.isBinaryExpression(expr) &&
        expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        const cond = expr.left.getText();
        const right = unwrap(expr.right);
        if (isJsx(right)) {
          const t = jsxToTree(right)[0];
          out.push({ ...t!, condition: cond });
        }
      }
    }

    return out;
  }

  function flattenChildren(
    children: ts.NodeArray<ts.JsxChild>,
  ): RootRenderTree[] {
    const result: RootRenderTree[] = [];
    children.forEach((child) => {
      const nodes = jsxToTree(child);
      nodes.forEach((n) => result.push({ name: n.name, children: n.children }));
    });
    return result;
  }
};
