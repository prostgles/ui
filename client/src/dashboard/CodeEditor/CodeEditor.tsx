import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { error } from "console";
import { useEffectDeep, usePromise } from "prostgles-client/dist/react-hooks";
import { isEqual } from "prostgles-types";
import { isObject } from "../../../../commonTypes/publishUtils";
import { classOverride } from "../../components/Flex";
import type { MonacoEditorProps } from "../../components/MonacoEditor/MonacoEditor";
import { MonacoEditor } from "../../components/MonacoEditor/MonacoEditor";
import { getMonaco } from "../SQLEditor/SQLEditor";
import { type editor, type Uri } from "../W_SQL/monacoEditorTypes";
import { registerLogLang } from "./registerLogLang";
import { setMonacoErrorMarkers } from "./utils/setMonacoErrorMarkers";
import {
  setMonacoEditorJsonSchemas,
  useSetMonacoJsonSchemas,
} from "./utils/setMonacoJsonSchemas";
import { useSetMonacoTsLibraries } from "./utils/setMonacoTsLibraries";
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

export type LanguageConfig =
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

// export default class CodeEditor extends React.Component<CodeEditorProps, S> {
//   state: Readonly<S> = {};

//   ref?: HTMLElement;
//   editor?: editor.IStandaloneCodeEditor;
//   error?: MonacoError;
//   componentDidMount() {
//     document.addEventListener("keydown", this.onKeyDown, false);
//     this.onUpdate();
//   }
//   componentDidUpdate(prevProps) {
//     this.onUpdate();
//   }
//   componentWillUnmount() {
//     document.removeEventListener("keydown", this.onKeyDown, false);
//   }

//   get languageObj() {
//     const { language } = this.props;
//     return isObject(language) ? language : undefined;
//   }

//   loadedActions = false;
//   setTSOpts = false;

//   jsonSchemas: CodeEditorJsonSchema[] | undefined;

//   loadedJsonSchema = false;
//   tsLibrariesStr = "";
//   onUpdate = async () => {
//     const { language, value, error, markers } = this.props;
//     const monaco = await getMonaco();
//     const languageObj = this.languageObj;
//     if (this.editor && languageObj?.lang === "json" && !this.loadedJsonSchema) {
//       this.loadedJsonSchema = true;
//       const shouldStopHere = await setMonacoJsonSchemas(
//         this,
//         value,
//         languageObj,
//       );
//       if (shouldStopHere) return;
//     }

//     if (language === "log") {
//       registerLogLang(monaco);
//     }

//     /* Set google search contextmenu option */
//     if (this.editor && !this.loadedActions) {
//       this.loadedActions = true;
//       this.editor.addAction({
//         id: "googleSearch",
//         label: "Search with Google",
//         // keybindings: [m.KeyMod.CtrlCmd | m.KeyCode.KEY_V],
//         contextMenuGroupId: "navigation",
//         run: (editor) => {
//           window.open(
//             "https://www.google.com/search?q=" + getSelectedText(editor),
//           );
//         },
//       });
//     }

//     await setMonacoTsLibraries(this, languageObj, monaco);

//     if (this.editor && !isEqual(this.error, error)) {
//       this.error = error;
//       setMonacoErrorMarkers(this.editor, monaco, { error });
//     } else if (this.editor) {
//       setMonacoErrorMarkers(this.editor, monaco, { markers });
//     }
//   };

//   onKeyDown = (e) => {
//     const _domElement =
//       (this.editor as any)?._domElement ?? ({} as HTMLDivElement);
//     if (
//       this.props.onSave &&
//       this.editor &&
//       e.ctrlKey &&
//       e.key === "s" &&
//       _domElement?.contains(e.target)
//     ) {
//       e.preventDefault();
//       this.props.onSave(this.editor.getValue());
//     }
//   };

//   render() {
//     const {
//       value = "",
//       onChange,
//       language: languageOrConf,
//       options = {},
//       style,
//       className = "",
//     } = this.props;
//     const language =
//       isObject(languageOrConf) ? languageOrConf.lang : languageOrConf;
//     return (
//       <div
//         className={classOverride(
//           "CodeEditor f-1 min-h-0 min-w-0 flex-col relative b b-color-2 relative",
//           className,
//         )}
//         style={style}
//         onFocus={() => {
//           const allCodeEditors = document.querySelectorAll(".CodeEditor");
//           if (allCodeEditors.length === 1) {
//             /** If this is the only editor the fix below will break it (viewedSqlTips) */
//             return;
//           }
//           /** This is needed to ensure jsonschema works. Otherwise only the first editor schema will work */
//           setMonacoJsonSchemas(this, value, this.languageObj);
//         }}
//       >
//         {/* {!isReady && <Loading variant="cover" />} */}
//         <MonacoEditor
//           className="f-1 min-h-0"
//           language={language}
//           loadedSuggestions={undefined}
//           value={value}
//           options={{
//             readOnly: !onChange,
//             renderValidationDecorations: "on",
//             parameterHints: { enabled: true },
//             fixedOverflowWidgets: true,
//             tabSize: 2,
//             automaticLayout: true,
//             ...(language === "json" && {
//               formatOnType: true,
//               autoIndent: "full",
//             }),
//             ...options,
//             ...(language === "log" && {
//               theme: "logview",
//             }),
//           }}
//           onMount={(editor) => {
//             this.editor = editor;
//             if (this.props.onChange) {
//               editor.onDidChangeModelContent((ev) => {
//                 const newValue = editor.getValue();
//                 if (this.props.value === newValue) return;
//                 this.props.onChange!(newValue);
//               });
//             }
//             /** This was breaking ts suggestions on opening quickly create function */
//             // this.forceUpdate();

//             this.props.onMount?.(editor);
//           }}
//         />
//       </div>
//     );
//   }
// }

export const CodeEditor = (props: CodeEditorProps) => {
  const {
    value = "",
    onChange,
    onMount,
    markers,
    onSave,
    language: languageOrConf,
    options = {},
    style,
    className = "",
    error,
  } = props;
  const language =
    isObject(languageOrConf) ? languageOrConf.lang : languageOrConf;

  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>();

  const monacoResult = usePromise(async () => {
    const monaco = await getMonaco();
    return { monaco };
  }, []);
  const monaco = monacoResult?.monaco;

  const languageObj = useMemo(() => {
    return isObject(languageOrConf) ? languageOrConf : undefined;
  }, [languageOrConf]);

  useSetMonacoJsonSchemas(editor, value, languageObj);
  useSetMonacoTsLibraries(editor, languageObj, monaco, value);

  useEffect(() => {
    if (!editor) return;
    /* Set google search contextmenu option */
    editor.addAction({
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
  }, [editor]);

  useEffect(() => {
    if (monaco && language === "log") {
      registerLogLang(monaco);
    }
  }, [language, monaco]);

  useEffectDeep(() => {
    if (!editor || !monaco) return;
    setMonacoErrorMarkers(editor, monaco, { error });
  }, [error, monaco]);

  useEffectDeep(() => {
    if (!editor || !monaco) return;
    setMonacoErrorMarkers(editor, monaco, { markers });
  }, [markers, monaco]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const _domElement =
        (editor as any)?._domElement ?? ({} as HTMLDivElement);
      if (
        onSave &&
        editor &&
        e.ctrlKey &&
        e.key === "s" &&
        _domElement?.contains(e.target)
      ) {
        e.preventDefault();
        onSave(editor.getValue());
      }
    };
    document.addEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keydown", onKeyDown, false);
  }, [onSave, editor]);

  const onMountMonacoEditor = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      setEditor(editor);
      onMount?.(editor);
    },
    [onMount],
  );

  const onFocus = useCallback(() => {
    const allCodeEditors = document.querySelectorAll(".CodeEditor");
    if (allCodeEditors.length === 1) {
      /** If this is the only editor the fix below will break it (viewedSqlTips) */
      return;
    }

    /** This is needed to ensure jsonschema works. Otherwise only the first editor schema will work */
    setMonacoEditorJsonSchemas(editor, value, languageObj);
  }, [editor, languageObj]);

  const monacoOptions = useMemo(() => {
    return {
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
    } satisfies editor.IStandaloneEditorConstructionOptions;
  }, [language, onChange, options]);

  return (
    <div
      className={classOverride(
        "CodeEditor f-1 min-h-0 min-w-0 flex-col relative b b-color-2 relative",
        className,
      )}
      style={style}
      onFocus={onFocus}
    >
      {/* {!isReady && <Loading variant="cover" />} */}
      <MonacoEditor
        className="f-1 min-h-0"
        language={language}
        loadedSuggestions={undefined}
        value={value}
        options={monacoOptions}
        onChange={onChange}
        onMount={onMountMonacoEditor}
      />
    </div>
  );
};
