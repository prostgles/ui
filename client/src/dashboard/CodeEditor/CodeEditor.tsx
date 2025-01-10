import React from "react";

import { isObject } from "../../../../commonTypes/publishUtils";
import { classOverride } from "../../components/Flex";
import type { MonacoEditorProps } from "../../components/MonacoEditor/MonacoEditor";
import { MonacoEditor } from "../../components/MonacoEditor/MonacoEditor";
import { omitKeys } from "prostgles-types";
import { getMonaco } from "../SQLEditor/SQLEditor";
import { type editor, type Uri } from "../W_SQL/monacoEditorTypes";
import { registerLogLang } from "./registerLogLang";
export type Suggestion = {
  type: "table" | "column" | "function";
  label: string;
  detail?: string;
  documentation?: string;
};

export type MonacoError = {
  message: string;
  code?: string;

  position?: number;
  length?: number;

  startLineNumber?: number;
  startColumn?: number;
  endLineNumber?: number;
  endColumn?: number;

  severity?: number;
};

export type MonacoJSONSchema = {
  id: string;

  /**
   * e.g.: "http://myserver/foo-schema.json", // id of the schema
   */
  uri: string; //Uri;

  theUri: Uri;

  /**
   * ["*"], // associate with our model
   */
  fileMatch?: string[];

  /**
   * JSON Schema
   * example >>> {
        type: "object",
        properties: {
          p1: {
            enum: ["v1", "v2"]
          },
          p2: {
            $ref: "http://myserver/bar-schema.json" // reference the second schema
          }
        }
      }
   */
  schema: Record<string, any>;
};

export type TSLibrary = {
  /**
   * 'ts:filename/facts.d.ts';
   */
  filePath: string;
  /**
   * type MyType = { a: number; b: string };
   * class MyClass { ... }
   */
  content: string;
};

type LanguageConfig =
  | {
      lang: "sql";
      suggestions?: Suggestion[];
    }
  | {
      lang: "typescript";
      /**
       * e.g.: 'myMethod2';
       * Must be unique for each model
       */
      modelFileName: string;
      tsLibraries?: TSLibrary[];
    }
  | {
      lang: "json";
      jsonSchemas?: CodeEditorJsonSchema[];
    };

export type CodeEditorJsonSchema = { id: string; schema: any };

export type CodeEditorProps = Pick<MonacoEditorProps, "options" | "value"> & {
  value: string;
  onChange?: (newValue: string) => any | void;
  language: LanguageConfig | string;
  /**
   * If true then will allow saving on CTRL+S
   */
  onSave?: (code: string) => any | void;
  error?: MonacoError;
  style?: React.CSSProperties;
  className?: string;
  markers?: editor.IMarkerData[];
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
};

type S = {
  schemas?: MonacoJSONSchema[];
};

const getSelectedText = (editor) =>
  editor.getModel().getValueInRange(editor.getSelection());

export default class CodeEditor extends React.Component<CodeEditorProps, S> {
  state: Readonly<S> = {};

  ref?: HTMLElement;
  editor?: editor.IStandaloneCodeEditor;
  error?: MonacoError;
  componentDidMount() {
    document.addEventListener("keydown", this.onKeyDown, false);
    this.onUpdate();
  }
  componentDidUpdate(prevProps) {
    this.onUpdate(prevProps);
  }
  componentWillUnmount() {
    document.removeEventListener("keydown", this.onKeyDown, false);
  }

  getMonaco = async () => {
    return getMonaco();
  };

  getSchemas = async (): Promise<MonacoJSONSchema[] | undefined> => {
    const monaco = await this.getMonaco();
    const { language } = this.props;
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

  /**
   * Ensure new json schemas are working
   */
  addedModelId?: string;
  setSchema = async (editor?: editor.IStandaloneCodeEditor) => {
    const { language } = this.props;
    const languageObj = isObject(language) ? language : undefined;
    if (languageObj?.lang !== "json") return;
    const monaco = await this.getMonaco();
    const mySchemas = await this.getSchemas();
    if (!mySchemas || !editor) return;
    const currentSchemas =
      monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas;

    const schemas = [
      ...mySchemas.filter(
        (s) => !currentSchemas?.some((ms) => ms.uri === s.uri),
      ),
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
          (this.props.value as any) ?? editor.getValue(),
          "json",
          mySchemas[0]?.theUri,
        );
        this.addedModelId = newModel.id;
        editor.setModel(newModel);
      } catch (error) {
        console.log(error);
      }
    } else {
      editor.setModel(matchingModel);
      editor.setValue(this.props.value);
      return;
    }
  };

  loadedActions = false;
  setTSOpts = false;

  loadedJsonSchema = false;
  tsLibrariesStr = "";
  onUpdate = async (prevProps?) => {
    const { error, language, markers } = this.props;
    const monaco = await this.getMonaco();
    const languageObj = isObject(language) ? language : undefined;
    if (this.editor && languageObj?.lang === "json" && !this.loadedJsonSchema) {
      this.loadedJsonSchema = true;
      this.setSchema(this.editor);
    }

    if (language === "log") {
      registerLogLang(monaco);
    }

    /* Set google search contextmenu option */
    if (this.editor && !this.loadedActions) {
      this.loadedActions = true;
      this.editor.addAction({
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
    }

    /* Add ts specific stuff */
    if (this.editor && languageObj?.lang === "typescript") {
      if (!this.setTSOpts) {
        this.setTSOpts = true;
        setTSoptions();
      }
      const { tsLibraries, modelFileName } = languageObj;
      const tsLibrariesStr = JSON.stringify(tsLibraries);
      if (tsLibraries && this.tsLibrariesStr !== tsLibrariesStr) {
        this.tsLibrariesStr = tsLibrariesStr;

        monaco.languages.typescript.typescriptDefaults.setExtraLibs(
          tsLibraries,
        );

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
          existingModel ??
          monaco.editor.createModel(this.props.value, "typescript", modelUri);
        this.editor.setModel(model);
      }
    }

    /* SET ERROR */
    if (
      this.editor &&
      JSON.stringify(this.error || {}) !== JSON.stringify(error || {})
    ) {
      this.error = error;
      const model = this.editor.getModel();
      if (!error && model) monaco.editor.setModelMarkers(model, "test", []);
      else if (error && model) {
        let offset = {};
        if (typeof error.position === "number") {
          let pos = error.position - 1 || 1;
          let len = error.length || 10;
          const sel = this.editor.getSelection();
          const selection = !sel ? undefined : model.getValueInRange(sel);
          // let selectionOffset = 0;
          if (selection && sel) {
            len = Math.max(1, Math.min(len, selection.length));
            pos += model.getOffsetAt({
              column: sel.startColumn,
              lineNumber: sel.startLineNumber,
            });
          }

          const s = model.getPositionAt(pos);
          const e = model.getPositionAt(pos + len);
          offset = {
            startLineNumber: s.lineNumber,
            startColumn: s.column,
            endLineNumber: e.lineNumber,
            endColumn: e.column,
          };
          this.editor.setPosition(s);
          this.editor.revealLine(s.lineNumber);
          this.editor.revealLineInCenter(s.lineNumber);
        }
        monaco.editor.setModelMarkers(model, "test", [
          {
            severity: 0,
            // @ts-ignore
            message: "error.message",
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: 0,
            endColumn: 5,
            code: "error.code",
            ...error,
            ...offset,
          },
        ]);
      }
    } else if (this.editor && Array.isArray(markers)) {
      const model = this.editor.getModel();
      if (model) {
        monaco.editor.setModelMarkers(model, "test2", []);
        monaco.editor.setModelMarkers(model, "test2", markers);
      }
    }
  };

  onKeyDown = (e) => {
    const _domElement =
      (this.editor as any)?._domElement ?? ({} as HTMLDivElement);
    if (
      this.props.onSave &&
      this.editor &&
      e.ctrlKey &&
      e.key === "s" &&
      _domElement?.contains(e.target)
    ) {
      e.preventDefault();
      this.props.onSave(this.editor.getValue());
    }
  };

  render() {
    const {
      value = "",
      onChange,
      language: languageOrConf,
      options = {},
      style,
      className = "",
    } = this.props;
    const language =
      isObject(languageOrConf) ? languageOrConf.lang : languageOrConf;
    return (
      <div
        className={classOverride(
          "CodeEditor f-1 min-h-0 min-w-0 flex-col relative b b-color-2",
          className,
        )}
        style={style}
        onFocus={() => {
          const allCodeEditors = document.querySelectorAll(".CodeEditor");
          if (allCodeEditors.length === 1) {
            /** If this is the only editor the fix below will break it (viewedSqlTips) */
            return;
          }
          /** This is needed to ensure jsonschema works. Otherwise only the first editor schema will work */
          this.setSchema(this.editor);
        }}
      >
        <MonacoEditor
          className="f-1 min-h-0"
          language={language}
          loadedSuggestions={undefined}
          value={value}
          options={{
            readOnly: !onChange,
            renderValidationDecorations: "on",
            parameterHints: { enabled: true },
            fixedOverflowWidgets: true,
            tabSize: 2,
            automaticLayout: true,
            ...(language === "json" && {
              formatOnType: true,
              autoIndent: "full",
            }),
            ...options,
            ...(language === "log" && {
              theme: "logview",
            }),
          }}
          onMount={(editor) => {
            this.editor = editor;
            if (this.props.onChange) {
              editor.onDidChangeModelContent((ev) => {
                const newValue = editor.getValue();
                if (this.props.value === newValue) return;
                this.props.onChange!(newValue);
              });
            }
            this.forceUpdate();
            this.props.onMount?.(editor);
          }}
        />
      </div>
    );
  }
}

const setTSoptions = async () => {
  const monaco = await getMonaco();
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
