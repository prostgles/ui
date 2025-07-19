import type { editor } from "../W_SQL/monacoEditorTypes";
import { getCurrentCodeBlock } from "./SQLCompletion/completionUtils/getCodeBlock";
import { getMonaco } from "./W_SQLEditor";
export const addSqlEditorFunctions = async (
  editor: editor.IStandaloneCodeEditor,
  smallestBlock: boolean,
) => {
  const monaco = await getMonaco();
  editor.addAction({
    id: "select1",
    label: "Select word",
    contextMenuGroupId: "selection",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
    run: (editor) => {
      const model = editor.getModel();
      const position = editor.getPosition();

      if (!model || !position) return;

      const word = model.getWordAtPosition(position);
      if (word) {
        editor.setSelection({
          startColumn: word.startColumn,
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        });
      }
    },
  });

  editor.addAction({
    id: "select2CB",
    label: "Select code block",
    contextMenuGroupId: "selection",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
    run: async (editor) => {
      const model = editor.getModel();
      const position = editor.getPosition();

      if (!model || !position) return;
      let cb = await getCurrentCodeBlock(model, position, undefined, {
        smallestBlock,
      });
      if (smallestBlock) {
        const selection = editor.getSelection();
        if (selection) {
          const selectedText = editor
            .getModel()
            ?.getValueInRange(selection)
            .trim();
          if (selectedText?.trim() === cb.text.trim()) {
            cb = await getCurrentCodeBlock(model, position, undefined, {
              smallestBlock: true,
              expandFrom: {
                startLine: selection.startLineNumber,
                endLine: selection.endLineNumber,
              },
            });
          }
        }
      }
      const lastToken = cb.tokens.at(-1);
      if (cb.textLC.trim() && lastToken) {
        editor.setSelection({
          startColumn: 1,
          startLineNumber: cb.startLine,
          endLineNumber: cb.endLine,
          endColumn: lastToken.end + 2,
        });
      }
    },
  });
};
