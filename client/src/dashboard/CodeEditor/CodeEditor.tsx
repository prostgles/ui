import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEventHandler,
} from "react";

import { isObject } from "@common/publishUtils";
import { classOverride } from "@components/Flex";
import type { MonacoEditorProps } from "@components/MonacoEditor/MonacoEditor";
import { MonacoEditor } from "@components/MonacoEditor/MonacoEditor";
import { useAppContext } from "@pages/AppContextProvider";
import { useEffectDeep, usePromise } from "prostgles-client";
import { getMonaco } from "../SQLEditor/W_SQLEditor";
import { type editor, type Uri } from "../W_SQL/monacoEditorTypes";
import {
  LOG_LANGUAGE_ID,
  LOG_LANGUAGE_THEME_DARK,
  LOG_LANGUAGE_THEME_LIGHT,
  registerLogLang,
} from "./registerLogLang";
import { setMonacoErrorMarkers } from "./utils/setMonacoErrorMarkers";
import {
  setMonacoEditorJsonSchemas,
  useSetMonacoJsonSchemas,
} from "./utils/useSetMonacoJsonSchemas";
import { useSetMonacoTsLibraries } from "./utils/useSetMonacoTsLibraries";
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

export type CodeEditorProps = Pick<
  MonacoEditorProps,
  "options" | "value" | "minHeight"
> & {
  value: string;
  onChange?: (newValue: string) => void;
  language: LanguageConfig | string;
  /**
   * If true then will allow saving on CTRL+S
   */
  onSave?: (code: string) => void;
  error?: MonacoError;
  style?: React.CSSProperties;
  className?: string;
  markers?: editor.IMarkerData[];
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  onTSLibraryChange?: (tsLibraries: TSLibrary[]) => void;
  contentTop?: React.ReactNode;
};

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
    onTSLibraryChange,
    contentTop,
    minHeight,
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
  useSetMonacoTsLibraries(
    editor,
    languageObj,
    monaco,
    value,
    onTSLibraryChange,
  );

  useEffect(() => {
    if (monaco && language === LOG_LANGUAGE_ID) {
      registerLogLang(monaco);
    }
  }, [language, monaco]);

  useEffectDeep(() => {
    if (!editor || !monaco) return;
    setMonacoErrorMarkers(editor, monaco, { error });
  }, [editor, error, monaco]);

  useEffectDeep(() => {
    if (!editor || !monaco) return;
    setMonacoErrorMarkers(editor, monaco, { markers });
  }, [editor, markers, monaco]);

  const onMountMonacoEditor = useCallback(
    (newEditor: editor.IStandaloneCodeEditor) => {
      setEditor(newEditor);
      onMount?.(newEditor);
    },
    [onMount],
  );

  const onKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const _domElement = (
        editor as { _domElement?: HTMLDivElement } | undefined
      )?._domElement;
      if (
        onSave &&
        editor &&
        e.ctrlKey &&
        e.key === "s" &&
        _domElement?.contains(e.target as Node)
      ) {
        e.preventDefault();
        onSave(editor.getValue());
      }
    },
    [onSave, editor],
  );

  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const onFocus = useCallback(() => {
    const allCodeEditors = document.querySelectorAll(".CodeEditor");
    if (allCodeEditors.length === 1) {
      /** If this is the only editor the fix below will break it (viewedSqlTips) */
      return;
    }

    /** This is needed to ensure jsonschema works. Otherwise only the first editor schema will work */
    void setMonacoEditorJsonSchemas(
      editor,
      latestValueRef.current,
      languageObj,
    );
  }, [editor, languageObj]);

  const { theme: appTheme } = useAppContext();
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
      ...(language === LOG_LANGUAGE_ID && {
        theme:
          appTheme === "light" ?
            LOG_LANGUAGE_THEME_LIGHT
          : LOG_LANGUAGE_THEME_DARK,
      }),
    } satisfies editor.IStandaloneEditorConstructionOptions;
  }, [language, onChange, options, appTheme]);

  return (
    <div
      className={classOverride(
        "CodeEditor f-1 min-h-0 min-w-0 flex-col relative b b-color relative",
        className,
      )}
      style={style}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      {contentTop}
      <MonacoEditor
        className="f-1 min-h-0"
        language={language}
        loadedSuggestions={undefined}
        value={value}
        options={monacoOptions}
        onChange={onChange}
        onMount={onMountMonacoEditor}
        minHeight={minHeight}
      />
    </div>
  );
};
