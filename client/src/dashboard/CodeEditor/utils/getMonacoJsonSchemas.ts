import { isObject, omitKeys } from "prostgles-types";
import { getMonaco } from "../../SQLEditor/SQLEditor";
import type { CodeEditorProps, MonacoJSONSchema } from "../CodeEditor";

export const getMonacoJsonSchemas = async (
  language: CodeEditorProps["language"],
): Promise<MonacoJSONSchema[] | undefined> => {
  const monaco = await getMonaco();
  const jsonSchemas =
    isObject(language) && language.lang === "json" ?
      language.jsonSchemas
    : undefined;
  if (!jsonSchemas) return;
  const schemas = jsonSchemas.map((s) => {
    const { id, schema } = s;
    const fileId = id + ".json";
    const theUri = monaco.Uri.parse("internal://server/" + fileId);
    const uri = theUri.toString();
    return {
      id,
      fileId,
      theUri,
      uri,
      schema: omitKeys(schema, ["$id", "$schema"]),
      fileMatch: [uri],
      // fileMatch: [`*`]
    };
  });

  return schemas;
};
