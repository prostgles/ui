import { isEqual } from "prostgles-types";
import type CodeEditor from "../CodeEditor";

export const setMonacoErrorMarkers = (
  codeEditor: CodeEditor,
  monaco: typeof import("monaco-editor"),
) => {
  const { error, markers } = codeEditor.props;
  if (codeEditor.editor && !isEqual(codeEditor.error, error)) {
    codeEditor.error = error;
    const model = codeEditor.editor.getModel();
    if (!error && model) monaco.editor.setModelMarkers(model, "test", []);
    else if (error && model) {
      let offset = {};
      if (typeof error.position === "number") {
        let pos = error.position - 1 || 1;
        let len = error.length || 10;
        const sel = codeEditor.editor.getSelection();
        const selection = !sel ? undefined : model.getValueInRange(sel);
        // let selectionOffset = 0;
        if (selection && sel) {
          len = Math.max(1, Math.min(len, selection.length));
          pos += model.getOffsetAt({
            column: sel.startColumn,
            lineNumber: sel.startLineNumber,
          });
        }

        const s = model.getPositionAt(pos);
        const e = model.getPositionAt(pos + len);
        offset = {
          startLineNumber: s.lineNumber,
          startColumn: s.column,
          endLineNumber: e.lineNumber,
          endColumn: e.column,
        };
        codeEditor.editor.setPosition(s);
        codeEditor.editor.revealLine(s.lineNumber);
        codeEditor.editor.revealLineInCenter(s.lineNumber);
      }
      monaco.editor.setModelMarkers(model, "test", [
        {
          severity: 0,
          // @ts-ignore
          message: "error.message",
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
  } else if (codeEditor.editor && Array.isArray(markers)) {
    const model = codeEditor.editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, "test2", []);
      monaco.editor.setModelMarkers(model, "test2", markers);
    }
  }
};
