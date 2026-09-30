import type { editor } from "monaco-editor";
import { useEffectDeep, useIsMounted, usePromise } from "prostgles-client";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { CodeEditorProps, LanguageConfig, TSLibrary } from "../CodeEditor";
import { installGoToDefinition } from "./installGoToDefinition";
import { useEffect } from "react";

export type MonacoEditorImport = typeof import("monaco-editor");

const cachedNodeLibs = new Map<string, TSLibrary[]>();

let lastLoadedLibsEditor: editor.IStandaloneCodeEditor | undefined;

export const useSetMonacoTsLibraries = (
  editor: editor.IStandaloneCodeEditor | undefined,
  languageObj: LanguageConfig | undefined,
  monaco: MonacoEditorImport | undefined,
  value: string,
  onTSLibraryChange: CodeEditorProps["onTSLibraryChange"],
) => {
  const getIsMounted = useIsMounted();
  const {
    dbsMethods: { getNodeTypes },
  } = usePrglCore();
  const isNodeEnv =
    languageObj?.lang === "typescript" && languageObj.environment === "nodejs";
  const nodeLibs = usePromise(async () => {
    if (!isNodeEnv || !monaco) return;
    const projectPath = languageObj.projectPath ?? "";
    const nodeTypes =
      (!projectPath ? cachedNodeLibs.get(projectPath) : undefined) ??
      (await getNodeTypes?.({
        projectPath: languageObj.projectPath,
      })) ??
      [];
    if (!projectPath) cachedNodeLibs.set(projectPath, nodeTypes);
    return nodeTypes.map((t) => ({
      content: t.content,
      filePath: monaco.Uri.file(t.filePath).toString(true),
    }));
  }, [languageObj, getNodeTypes, isNodeEnv, monaco]);
  useEffect(() => {
    if (!monaco) return;
    setTSoptions(monaco);
  }, [monaco, getNodeTypes]);

  useEffectDeep(() => {
    if (!monaco || !editor || languageObj?.lang !== "typescript") return;
    const {
      environment,
      tsLibraries,
      modelFileName,
      importedModels = {},
    } = languageObj;
    const extraLibs =
      environment === "nodejs" ?
        [...(nodeLibs ?? []), ...(tsLibraries ?? [])]
      : tsLibraries;
    if (!extraLibs) return;
    const setExtraLibs = () => {
      monaco.languages.typescript.typescriptDefaults.setExtraLibs(extraLibs);
      lastLoadedLibsEditor = editor;
    };
    editor.onDidFocusEditorText(() => {
      if (lastLoadedLibsEditor !== editor) {
        setExtraLibs();
      }
    });
    setExtraLibs();
    /* 
        THIS CLOSES ALL OTHER EDITORS 
        This is/was? needed to prevent this error: Type annotations can only be used in TypeScript files. 
      */
    // monaco.editor.getModels().forEach(model => model.dispose());

    const getExistingModelOrCreate = (fileName: string, content: string) => {
      const modelUri = monaco.Uri.file(fileName);
      const existingModel = monaco.editor
        .getModels()
        .find((m) => m.uri.path === modelUri.path);
      return (
        existingModel ??
        monaco.editor.createModel(content, "typescript", modelUri)
      );
    };
    Object.entries(importedModels).forEach(([modelName, modelContent]) => {
      getExistingModelOrCreate(modelName, modelContent);
    });

    const model = getExistingModelOrCreate(modelFileName, value);
    // const modelUri = monaco.Uri.parse(`file:///${modelFileName}`);
    // const existingModel = monaco.editor
    //   .getModels()
    //   .find((m) => m.uri.path === modelUri.path);
    // const model =
    //   existingModel ?? monaco.editor.createModel(value, "typescript", modelUri);

    if (!getIsMounted()) return;
    try {
      editor.setModel(model);
      void installGoToDefinition(editor);
    } catch (e) {
      console.error(e);
    }
    onTSLibraryChange?.(extraLibs);
  }, [editor, monaco, languageObj, onTSLibraryChange, getIsMounted, nodeLibs]);
};

const setTSoptions = (monaco: MonacoEditorImport) => {
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
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: "React",
    /** Adding this line breaks inbuild functions (setTimeout, etc) */
    // lib: ["DOM", "ES2017", "es2019", "ES2021.String", "ES2020", "ES2022"],
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
