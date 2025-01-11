import { getMonaco } from "../../SQLEditor/SQLEditor";
import type { LanguageConfig } from "../CodeEditor";
import { getMonacoJsonSchemas } from "./getMonacoJsonSchemas";
import type CodeEditor from "../CodeEditor";
import { isEqual } from "prostgles-types";

export const setMonacoJsonSchemas = async (
  codeEditor: CodeEditor,
  value: string,
  languageObj: LanguageConfig | undefined,
) => {
  const editor = codeEditor.editor;
  if (!editor) return;
  if (languageObj?.lang !== "json") return;
  const { jsonSchemas } = languageObj;
  if (isEqual(codeEditor.jsonSchemas, jsonSchemas)) return;
  codeEditor.jsonSchemas = jsonSchemas;
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
  } else {
    editor.setModel(matchingModel);
    editor.setValue(value);
    return true;
  }
};
