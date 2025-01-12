import type { editor } from "monaco-editor";
import type { LanguageConfig } from "../CodeEditor";
import { useEffect } from "react";
import { useIsMounted } from "../../Backup/CredentialSelector";
import { useEffectDeep } from "prostgles-client/dist/react-hooks";

export const useSetMonacoTsLibraries = async (
  editor: editor.IStandaloneCodeEditor | undefined,
  languageObj: LanguageConfig | undefined,
  monaco: typeof import("monaco-editor") | undefined,
  value: string,
) => {
  const getIsMounted = useIsMounted();
  useEffect(() => {
    if (!monaco) return;
    setTSoptions(monaco);
  }, [monaco]);

  useEffectDeep(() => {
    if (!monaco || !editor || languageObj?.lang !== "typescript") return;
    const { tsLibraries, modelFileName } = languageObj;
    if (!tsLibraries) return;
    monaco.languages.typescript.typescriptDefaults.setExtraLibs(tsLibraries);
    /* 
        THIS CLOSES ALL OTHER EDITORS 
        This is/was? needed to prevent this error: Type annotations can only be used in TypeScript files. 
      */
    // monaco.editor.getModels().forEach(model => model.dispose());

    const modelUri = monaco.Uri.parse(`file:///${modelFileName}.ts`);
    const existingModel = monaco.editor
      .getModels()
      .find((m) => m.uri.path === modelUri.path);
    const model =
      existingModel ?? monaco.editor.createModel(value, "typescript", modelUri);

    if (!getIsMounted()) return;
    try {
      editor.setModel(model);
    } catch (e) {
      console.error(e);
    }
  }, [editor, monaco, languageObj]);
};

const setTSoptions = async (monaco: typeof import("monaco-editor")) => {
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    allowJs: true,
    checkJs: true,
    esModule: false,
    experimentalDecorators: true,
    keyofStringsOnly: true,
    /** Adding this line breaks inbuild functions (setTimeout, etc) */
    // lib: [ "ES2017", "es2019", "ES2021.String", "ES2020", "ES2022" ] ,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    declaration: true,
    declarationMap: true,
    ignoreDeprecations: "5.0",
    strict: true,
    skipLibCheck: true,
    typeRoots: ["node_modules/@types"],
  });

  // extra libraries
  // monaco.languages.typescript.typescriptDefaults.addExtraLib(
  //   `export declare function next() : string`,
  //   'node_modules/@types/external/index.d.ts'
  // );
  // monaco.languages.typescript.javascriptDefaults.addExtraLib(getExtraLib("node/globals.d.ts"),  monaco.Uri.parse("ts:filename/globals.d.ts"));
  // monaco.languages.typescript.javascriptDefaults.addExtraLib(getExtraLib("node/fs.d.ts"),  monaco.Uri.parse("ts:filename/ts.d.ts"));

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
};
