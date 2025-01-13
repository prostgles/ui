import type { editor, IRange } from "monaco-editor";
import type { MonacoError } from "../SQLEditor";
import type { CodeBlock } from "../SQLCompletion/completionUtils/getCodeBlock";
import { scrollToLineIfNeeded } from "./scrollToLineIfNeeded";
import type { WindowData } from "../../Dashboard/dashboardUtils";

export const setMonacEditorError = async (
  editor: editor.IStandaloneCodeEditor,
  monaco: typeof import("monaco-editor"),
  getCurrentCodeBlock: () => Promise<CodeBlock> | undefined,
  errorMessageDisplay: WindowData["sql_options"]["errorMessageDisplay"],
  error: MonacoError | undefined,
) => {
  const model = editor.getModel();
  if (!model) return;
  if (!error) monaco.editor.setModelMarkers(model, "test", []);
  else {
    let offset: Partial<IRange> = {};
    if (typeof error.position === "number") {
      let pos = error.position - 1 || 0;
      let len = error.length || 10;
      let selectionStartIndex = 0;
      let codeLength = model.getValue().length;
      let selectionLength = 0;
      const sel = editor.getSelection();
      if (sel) {
        const selection = editor.getModel()?.getValueInRange(sel);
        // let selectionOffset = 0;
        if (selection) {
          selectionStartIndex = model.getOffsetAt({
            column: sel.startColumn,
            lineNumber: sel.startLineNumber,
          });
          selectionLength = selection.length;
        }
      }

      if (!selectionLength) {
        const codeBlock = await getCurrentCodeBlock();
        if (codeBlock) {
          selectionStartIndex = model.getOffsetAt({
            column: 1,
            lineNumber: codeBlock.startLine,
          });
          selectionLength = codeBlock.text.length;
        }
      }

      if (selectionLength) {
        codeLength = selectionLength;
        pos += selectionStartIndex;
      }
      /** Ensure error does not extend beyond active code */
      len = Math.max(1, Math.min(len, selectionStartIndex + codeLength - pos));

      const s = model.getPositionAt(pos);
      const e = model.getPositionAt(pos + len);
      offset = {
        startLineNumber: s.lineNumber,
        startColumn: s.column,
        endLineNumber: e.lineNumber,
        endColumn: e.column,
      };
      /** Do not reposition cursor on error */
      // this.editor.setPosition(s);
      scrollToLineIfNeeded(editor, s.lineNumber);
    }

    if (errorMessageDisplay !== "bottom") {
      const messageContribution = editor.getContribution(
        "editor.contrib.messageController",
      );
      (messageContribution as any).showMessage(error.message, {
        ...editor.getPosition(),
        lineNumber: offset.startLineNumber,
        column: offset.endColumn,
      });
    }

    monaco.editor.setModelMarkers(model, "test", [
      {
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: 0,
        endColumn: 5,
        code: "error.code",
        ...error,
        ...offset,
      },
    ]);
  }
};
