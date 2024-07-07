
import React from "react";
 
import { omitKeys } from "../../utils";
import type { MonacoEditorProps } from "../W_SQL/MonacoEditor";
import { MonacoEditor } from "../W_SQL/MonacoEditor";
import { languages, type editor, type Uri } from "../W_SQL/monacoEditorTypes";
import { classOverride } from "../../components/Flex";
import { registerLogLang } from "./registerLogLang";
import { getMonaco } from "../SQLEditor/SQLEditor";
export type Suggestion = {
  type: "table" | "column" | "function";
  label: string;
  detail?: string;
  documentation?: string;
}

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

export type CodeEditorProps = Pick<MonacoEditorProps, "options" | "value" | "language"> & {
  value: string;
  onChange?: (newValue: string) => any | void;
  /**
   * If true then will allow saving on CTRL+S
   */
  onSave?: (code: string) => any | void;
  suggestions?: Suggestion[];
  error?: MonacoError;
  language: string;
  style?: React.CSSProperties;
  className?: string;
  markers?: editor.IMarkerData[];
  tsLibraries?: {
    /**
     * 'ts:filename/facts.d.ts';
     */
    filePath: string;
    /**
     * type MyType = { a: number; b: string };
     * class MyClass { ... }
     */
    content: string;
  }[];
  onMount?: ((editor: editor.IStandaloneCodeEditor) => void);
  jsonSchemas?: { id: string; schema: any; }[];
};
type S = {
  schemas?: MonacoJSONSchema[]
};

const getSelectedText = (editor) => editor.getModel().getValueInRange(editor.getSelection());

export default class CodeEditor extends React.Component<CodeEditorProps, S> {

  state: Readonly<S> = {

  }

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
  }

  getSchemas = async (): Promise<MonacoJSONSchema[] | undefined> => {

    const monaco = await this.getMonaco()
    const { jsonSchemas } = this.props;
    // const monaco = this._monaco;
    if (!jsonSchemas) return;
    const schemas = jsonSchemas.map(s => {
      const { id, schema } = s;
      const fileId = id + ".json";
      const theUri = monaco.Uri.parse("internal://server/" + fileId)
      const uri = theUri.toString();
      return {
        id,
        fileId,
        theUri,
        uri,
        schema: omitKeys(schema, ["$id", "$schema"]),
        fileMatch: [uri],
        // fileMatch: [`*`]
      }
    })

    return schemas;
  }

  /**
   * Ensure new json schemas are working
   */
  addedModelId?: string;
  setSchema = async (editor?: editor.IStandaloneCodeEditor) => {
    // const monaco = this._monaco;
    
    const monaco = await this.getMonaco()
    const mySchemas = await this.getSchemas();
    if (!mySchemas || !editor) return;
    const currentSchemas = monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas;

    const schemas = [
      // ...currentSchemas?.filter(s => !mySchemas.some(ms => ms.uri === s.uri)) ?? [],
      ...mySchemas.filter(s => !currentSchemas?.some(ms => ms.uri === s.uri)),
    ];
    monaco.languages.json.jsonDefaults
      .setDiagnosticsOptions({
        // schemaRequest: "warning", 
        enableSchemaRequest: true,
        validate: true,
        schemas: schemas
      });

    // SQL Editor options not working if opened twice
    // const model = editor.getModel();
    const models = monaco.editor.getModels();
    const matchingModel = models.find(m => m.uri.path === mySchemas[0]?.theUri.path)
    if (!matchingModel) { //  || (!this.addedModelId || this.addedModelId !== matchingModel.id)
      // monaco.editor.getModels().forEach(model => model.dispose());

      try {
        const newModel = monaco.editor.createModel(this.props.value as any ?? editor.getValue(), "json", mySchemas[0]?.theUri);
        this.addedModelId = newModel.id;
        editor.setModel(newModel);

      } catch (error) {
        console.log(error)
      }

    } else {

      editor.setModel(matchingModel);
      editor.setValue(this.props.value);
      return
    }


  }

  loadedActions = false;
  setTSOpts = false;

  loadedJsonSchema = false;
  tsLibrariesStr = "";
  onUpdate = async (prevProps?) => {
    const { error, language, markers, tsLibraries, jsonSchemas } = this.props;
    const monaco = await this.getMonaco();

    if (this.editor && jsonSchemas && !this.loadedJsonSchema) {
      this.loadedJsonSchema = true;
      this.setSchema(this.editor);
    }

    if(language === "log"){
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
          window.open("https://www.google.com/search?q=" + getSelectedText(editor))
        }
      });
    }

    /* Add ts specific stuff */
    if (this.editor && language === "typescript") {
      if (!this.setTSOpts) {
        this.setTSOpts = true;
        setTSoptions();
      }

      const tsLibrariesStr = JSON.stringify(tsLibraries);
      if (tsLibraries && this.tsLibrariesStr !== tsLibrariesStr) {
        this.tsLibrariesStr = tsLibrariesStr;

        monaco.languages.typescript.typescriptDefaults.setExtraLibs(tsLibraries);

        // this.loadedTSLibs?.forEach(d => d.dispose());
        // this.loadedTSLibs = tsLibraries.map(({ path, content }) => {
        //   const d = monaco.languages.typescript.typescriptDefaults.addExtraLib(content, path);
        //   // When resolving definitions and references, the editor will try to use created models.
        //   // Creating a model for the library allows "peek definition/references" commands to work with the library.
        //   // monaco.editor.createModel(content, 'typescript', monaco.Uri.parse(path));

        //   return d;
        // });

        /* This is needed to prevent this error: Type annotations can only be used in TypeScript files. */
        monaco.editor.getModels().forEach(model => model.dispose());
        this.editor.setModel(
          monaco.editor.createModel(this.props.value, "typescript", monaco.Uri.parse("file:///main.ts"))
        )
      }
    }

    /* SET ERROR */
    if (this.editor && JSON.stringify(this.error || {}) !== JSON.stringify(error || {})) {
      this.error = error;
      const model = this.editor.getModel();
      if (!error && model) monaco.editor.setModelMarkers(model, "test", []);
      else if (error && model) {
        let offset = {};
        if (typeof error.position === "number") {
          let pos = (error.position - 1) || 1;
          let len = error.length || 10;
          const sel = this.editor.getSelection();
          const selection = !sel ? undefined : model.getValueInRange(sel);
          // let selectionOffset = 0;
          if (selection && sel) {
            len = Math.max(1, Math.min(len, selection.length));
            pos += model.getOffsetAt({
              column: sel.startColumn,
              lineNumber: sel.startLineNumber
            });
          }

          const s = model.getPositionAt(pos);
          const e = model.getPositionAt(pos + len);
          offset = {
            startLineNumber: s.lineNumber,
            startColumn: s.column,
            endLineNumber: e.lineNumber,
            endColumn: e.column,
          }
          this.editor.setPosition(s);
          this.editor.revealLine(s.lineNumber);
          this.editor.revealLineInCenter(s.lineNumber);

        }
        monaco.editor.setModelMarkers(model, "test", [{
          severity: 0,
          // @ts-ignore
          message: "error.message",
          startLineNumber: 0,
          startColumn: 0,
          endLineNumber: 0,
          endColumn: 5,
          code: "error.code",
          ...error,
          ...offset
        }]);

      }
    } else if (this.editor && Array.isArray(markers)) {
      const model = this.editor.getModel();
      if (model) {
        monaco.editor.setModelMarkers(model, "test2", []);
        monaco.editor.setModelMarkers(model, "test2", markers);
      }

    }


  }

  onKeyDown = e => {
    const _domElement = (this.editor as any)?._domElement ?? {} as HTMLDivElement;
    if (this.props.onSave &&
      this.editor &&
      e.ctrlKey &&
      e.key === "s" &&
      _domElement?.contains(e.target)
    ) {
      e.preventDefault();
      this.props.onSave(this.editor.getValue());
    }
  }

  render() {
    const { value = "", onChange, language, options = {}, style, className = "" } = this.props;

    return <div className={classOverride("f-1 min-h-0 min-w-0 flex-col relative b b-color-2", className)}
      style={style}
    >
      <MonacoEditor
        className="f-1 min-h-0"
        language={language}
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
            theme: "logview"
          })
        }}
        onMount={(editor) => {
          this.editor = editor;
          if (onChange) {
            editor.onDidChangeModelContent(ev => {
              const newValue = editor.getValue();
              if (this.props.value === newValue) return;
              onChange(newValue);
            });
          }
          this.forceUpdate();
          this.props.onMount?.(editor);
        }} />
    </div>
  }
}



const setTSoptions = async () => {
  const monaco = await getMonaco()
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
		esModuleInterop : true,
		allowSyntheticDefaultImports: true,
		declaration: true,
		declarationMap: true,
		ignoreDeprecations: "5.0",
		strict: true,
		skipLibCheck: true,
    typeRoots: ["node_modules/@types"]
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
    noSyntaxValidation: false
  });
}
