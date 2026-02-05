import ts from "typescript";
import * as fs from "fs";
/**
 * Given a string definition of an agentic workflow, parse it into a structured format that can be used to execute the workflow
 */
export function parseAgenticWorkflowDefinition(sourceText: string) {
  const fileName = "workflow.ts";
  const shim = "";
  const libFileName = ts.getDefaultLibFileName({
    target: ts.ScriptTarget.ES2020,
  });
  const libFilePath = ts.getDefaultLibFilePath({
    target: ts.ScriptTarget.ES2020,
  });
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    strict: true,
    noEmit: true,
    lib: [libFileName],
    // lib: ["lib.es2020.full.d.ts"],
    types: [],
    typeRoots: [],
    skipLibCheck: true,
  };
  // 1) Compile check
  const compilerHost = ts.createCompilerHost(options, true);
  compilerHost.getSourceFile = (f) => {
    if (f === fileName) return sourceFile;
    if (f === libFilePath) {
      const libText = fs.readFileSync(libFilePath, "utf8");
      return ts.createSourceFile(f, libText, ts.ScriptTarget.ES2020, true);
    }
    return undefined;
  };
  compilerHost.readFile = (f) => {
    if (f === fileName) return shim + sourceText;
    if (f === libFilePath) return fs.readFileSync(libFilePath, "utf8");
    return undefined;
  };
  compilerHost.fileExists = (f) => f === fileName || f === libFilePath;

  const program = ts.createProgram([fileName], options, compilerHost);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length) {
    const errors = diagnostics.map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    );
    return { ok: false, errors };
  }

  // 2) Extract defineAgenticWorkflow arguments from default export
  let definitionsArg = null as ts.Expression | null;
  let workflowArg = null as ts.Expression | null;

  sourceFile.forEachChild((node) => {
    if (
      ts.isExportAssignment(node) &&
      ts.isCallExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "defineAgenticWorkflow"
    ) {
      definitionsArg = node.expression.arguments[0] ?? null;
      workflowArg = node.expression.arguments[1] ?? null;
    }
  });

  if (!definitionsArg || !workflowArg) {
    return {
      ok: false,
      errors: ["Missing default export defineAgenticWorkflow(...)"],
    };
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const definitionsText = printer.printNode(
    ts.EmitHint.Unspecified,
    definitionsArg,
    sourceFile,
  );
  const workflowText = printer.printNode(
    ts.EmitHint.Unspecified,
    workflowArg,
    sourceFile,
  );

  return {
    ok: true,
    definitionsText,
    workflowText,
  };
}
