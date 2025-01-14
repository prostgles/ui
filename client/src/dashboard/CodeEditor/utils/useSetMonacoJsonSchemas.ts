import type { editor } from "monaco-editor";
import { useEffectDeep } from "prostgles-client/dist/react-hooks";
import { getMonaco } from "../../SQLEditor/SQLEditor";
import type { LanguageConfig } from "../CodeEditor";
import { getMonacoJsonSchemas } from "./getMonacoJsonSchemas";

export const useSetMonacoJsonSchemas = (
  editor: editor.IStandaloneCodeEditor | undefined,
  value: string,
  languageObj: LanguageConfig | undefined,
) => {
  useEffectDeep(() => {
    setMonacoEditorJsonSchemas(editor, value, languageObj);
  }, [editor, languageObj]);
};

export const setMonacoEditorJsonSchemas = async (
  editor: editor.IStandaloneCodeEditor | undefined,
  value: string,
  languageObj: LanguageConfig | undefined,
) => {
  if (!editor || !languageObj || languageObj.lang !== "json") return;
  const monaco = await getMonaco();
  const mySchemas = await getMonacoJsonSchemas(languageObj);
  if (!mySchemas) return;
  const currentSchemas =
    monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas;

  const schemas = [
    ...mySchemas.filter((s) => !currentSchemas?.some((ms) => ms.uri === s.uri)),
  ];
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    // schemaRequest: "warning",
    enableSchemaRequest: true,
    validate: true,
    schemas: schemas,
  });

  // SQL Editor options not working if opened twice
  // const model = editor.getModel();
  const models = monaco.editor.getModels();
  const matchingModel = models.find(
    (m) => m.uri.path === mySchemas[0]?.theUri.path,
  );
  if (!matchingModel) {
    try {
      const newModel = monaco.editor.createModel(
        /** Why might be undefined?! */
        (value as string | undefined) ?? editor.getValue(),
        "json",
        mySchemas[0]?.theUri,
      );
      editor.setModel(newModel);
    } catch (error) {
      console.log(error);
    }
  } else if (editor.getModel()?.id !== matchingModel.id) {
    editor.setModel(matchingModel);
    editor.setValue(value);
    return true;
  }
};
