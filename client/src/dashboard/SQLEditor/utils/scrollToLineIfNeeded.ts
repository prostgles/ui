import type { editor } from "monaco-editor";

export const scrollToLineIfNeeded = (
  editor: editor.IStandaloneCodeEditor,
  lineNumber: number,
) => {
  const [vL1] = editor.getVisibleRanges();
  if (
    vL1 &&
    !(
      vL1.startLineNumber - 1 <= lineNumber &&
      vL1.endLineNumber + 1 >= lineNumber
    )
  ) {
    editor.revealLineInCenterIfOutsideViewport(lineNumber);
  }
};
