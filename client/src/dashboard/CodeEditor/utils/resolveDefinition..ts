import type { IPosition } from "monaco-editor";
import { getMonaco } from "src/dashboard/SQLEditor/W_SQLEditor";
import type { editor } from "src/dashboard/W_SQL/monacoEditorTypes";

export const resolveDefinition = async (
  editor: editor.IStandaloneCodeEditor,
  position: IPosition,
): Promise<{ model: editor.ITextModel; pos: IPosition } | null> => {
  const model = editor.getModel();
  if (!model) return null;

  const monaco = await getMonaco();
  const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
  const client = await getWorker(model.uri);

  const offset = model.getOffsetAt(position);
  const defs = await client.getDefinitionAtPosition(
    model.uri.toString(),
    offset,
  );

  if (!defs?.length) return null;

  const { fileName, textSpan } = defs[0];

  // fileName comes back as "file:///foo.ts" — parse it directly
  const targetUri = monaco.Uri.parse(fileName);
  const targetModel = monaco.editor.getModel(targetUri);
  if (!targetModel) return null;

  const targetPos = targetModel.getPositionAt(textSpan.start);
  return { model: targetModel, pos: targetPos };
};
