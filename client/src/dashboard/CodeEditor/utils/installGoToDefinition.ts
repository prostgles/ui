import type { editor, IDisposable } from "monaco-editor";
import { getMonaco } from "src/dashboard/SQLEditor/W_SQLEditor";
import { installBackForward, navigateTo } from "./navigateTo";
import { resolveDefinition } from "./resolveDefinition.";

export const installGoToDefinition = async (
  editor: editor.IStandaloneCodeEditor,
): Promise<IDisposable> => {
  const monaco = await getMonaco();
  const result = editor.onMouseDown(async (e) => {
    const isCtrlClick =
      (e.event.ctrlKey || e.event.metaKey) &&
      !e.event.shiftKey &&
      !e.event.altKey;

    if (!isCtrlClick) return;
    if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) return;

    // Prevent Monaco's built-in opener (which fails silently on virtual files)
    e.event.preventDefault();
    e.event.stopPropagation();

    const position = e.target.position;
    // if (!position) return;

    const currentModel = editor.getModel();
    if (!currentModel) return;

    const result = await resolveDefinition(editor, position);
    if (!result) return;

    void navigateTo(editor, result.model, result.pos, {
      uri: currentModel.uri.toString(),
      position: editor.getPosition() ?? position,
    });
  });

  installBackForward(editor, monaco);
  return result;
};
