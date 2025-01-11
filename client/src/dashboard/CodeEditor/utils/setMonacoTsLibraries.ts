import type { LanguageConfig } from "../CodeEditor";
import type CodeEditor from "../CodeEditor";

export const setMonacoTsLibraries = async (
  codeEditor: CodeEditor,
  languageObj: LanguageConfig | undefined,
  monaco: typeof import("monaco-editor"),
) => {
  const editor = codeEditor.editor;
  const value = codeEditor.props.value;
  if (!editor || languageObj?.lang !== "typescript") {
    return;
  }
  if (!codeEditor.setTSOpts) {
    codeEditor.setTSOpts = true;
    setTSoptions(monaco);
  }
  const { tsLibraries, modelFileName } = languageObj;
  const tsLibrariesStr = JSON.stringify(tsLibraries);
  if (tsLibraries && codeEditor.tsLibrariesStr !== tsLibrariesStr) {
    codeEditor.tsLibrariesStr = tsLibrariesStr;

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
    editor.setModel(model);
  }
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
    // lib: [ "ES2017", "es2019", "ES2021.String", "ES2020", "ES2022" ],
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
