import type { editor } from "monaco-editor";
import { useEffect } from "react";
import { LANG } from "src/dashboard/SQLEditor/W_SQLEditor";

export const useMonacoEditorAddActions = (
  editor: editor.IStandaloneCodeEditor | undefined,
  language: string,
) => {
  useEffect(() => {
    if (!editor) return;

    editor.addAction({
      id: "googleSearch",
      label: "Search with Google",
      // keybindings: [m.KeyMod.CtrlCmd | m.KeyCode.KEY_V],
      contextMenuGroupId: "navigation",
      run: (editor) => {
        window.open(
          "https://www.google.com/search?q=" + getSelectedText(editor),
        );
      },
    });
    // editor.addAction({
    //   id: "savedwa",
    //   label: "Save (Ctrl + S)",
    //   keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
    //   contextMenuGroupId: "navigation",
    //   run: (editor) => {
    //     alert("Save action triggered");
    //   },
    // });

    if (language !== LANG) return;
    editor.addAction({
      id: "googleSearchPG",
      label: "Search with Google Postgres",
      // keybindings: [m.KeyMod.CtrlCmd | m.KeyCode.KEY_V],
      contextMenuGroupId: "navigation",
      run: (editor) => {
        window.open(
          "https://www.google.com/search?q=postgres+" + getSelectedText(editor),
        );
      },
    });
  }, [editor, language]);
};

export const getSelectedText = (
  editor: editor.ICodeEditor | editor.IStandaloneCodeEditor | undefined,
): string => {
  if (!editor) return "";
  const model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) return "";
  return model.getValueInRange(selection);
};
