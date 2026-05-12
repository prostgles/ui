import { useEffectDeep, useMemoDeep } from "prostgles-client";
import { getKeys, isEqual, pickKeys, type AnyObject } from "prostgles-types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { appTheme, useReactiveState } from "../../appUtils";
import type { LoadedSuggestions } from "../../dashboard/Dashboard/dashboardUtils";

import type { TestSelectors } from "src/Testing";
import {
  CUSTOM_MONACO_SQL_THEMES,
  defineCustomMonacoSQLTheme,
} from "../../dashboard/SQLEditor/defineCustomMonacoSQLTheme";
import { getMonaco } from "../../dashboard/SQLEditor/W_SQLEditor";
import type { editor, Monaco } from "../../dashboard/W_SQL/monacoEditorTypes";
import { loadPSQLLanguage } from "../../dashboard/W_SQL/MonacoLanguageRegister";
import { isPlaywrightTest } from "../../i18n/i18nUtils";
import {
  hackyFixOptionmatchOnWordStartOnly,
  hackyShowDocumentationBecauseStorageServiceIsBrokenSinceV42,
} from "./monacoHackyFixes";
import { useMonacoEditorAddActions } from "./useMonacoEditorAddActions";

export type MonacoEditorProps = Pick<TestSelectors, "data-command"> & {
  language: string;
  value: string;
  onChange?: (
    value: string,
    editor: editor.IStandaloneCodeEditor,
    monaco: undefined | Monaco,
  ) => void;
  className?: string;
  /**
   * @default true
   */
  expandSuggestionDocs?: boolean;
  options?: editor.IStandaloneEditorConstructionOptions;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  style?: React.CSSProperties;
  loadedSuggestions: LoadedSuggestions | undefined;
  /**
   * @default 200
   */
  minHeight?: number;
  minWidth?: number | string;
};

let monacoPromise: Promise<Monaco> | undefined;
let monacoResolved: Monaco | undefined;
const useMonacoSingleton = () => {
  const [monaco, setMonaco] = useState(monacoResolved);
  useEffect(() => {
    if (!monacoResolved) {
      void (async () => {
        monacoPromise ??= getMonaco();
        monacoResolved = await monacoPromise;
        await defineCustomMonacoSQLTheme();
        setMonaco(monacoResolved);
      })();
    }
  }, []);

  return { monaco };
};

/** This wrapping check necessary to ensure:
 * - getTokens returns correct data
 * - opening json schema formfield does not cause cancelled promise errors (/server-settings)
 * */
export const MonacoEditor = (props: MonacoEditorProps) => {
  const { loadedSuggestions } = props;

  const [loadedLanguage, setLoadedLanguage] = useState(false);
  useEffect(() => {
    void loadPSQLLanguage(loadedSuggestions).then(() => {
      setLoadedLanguage(true);
    });
  }, [loadedSuggestions]);

  if (!loadedLanguage) {
    return <div> </div>;
  }
  return <MonacoEditorWithoutLanguage {...props} />;
};

const MonacoEditorWithoutLanguage = (props: MonacoEditorProps) => {
  const [editor, setEditor] = React.useState<editor.IStandaloneCodeEditor>();
  const container = React.useRef<HTMLDivElement>(null);
  const { state: _appTheme } = useReactiveState(appTheme);

  const {
    language,
    value,
    options,
    onMount,
    onChange,
    expandSuggestionDocs = true,
    minHeight = 200,
    minWidth = `min(600px, calc(100vw - 100px))`,
  } = props;

  const valueRef = useRef(value);

  const monacoRef = useRef<Monaco>();

  const fullOptions = useMemoDeep(() => {
    const themeFromOptions = options?.theme;
    const theme =
      themeFromOptions && themeFromOptions !== "vs" ?
        themeFromOptions
      : CUSTOM_MONACO_SQL_THEMES[_appTheme];
    return {
      ...options,
      theme,
    };
  }, [_appTheme, options]);

  const { monaco } = useMonacoSingleton();

  useEffectDeep(() => {
    if (!container.current || !monaco) return;

    monacoRef.current = monaco;
    const editorOptions: editor.IStandaloneEditorConstructionOptions = {
      value: valueRef.current,
      language,
      ...fullOptions,
      matchOnWordStartOnly: false,
    };

    const newEditor = monaco.editor.create(container.current, editorOptions);
    hackyFixOptionmatchOnWordStartOnly(newEditor);
    hackyShowDocumentationBecauseStorageServiceIsBrokenSinceV42(
      newEditor,
      expandSuggestionDocs,
    );
    /** Remove these keybindings from monaco */
    monaco.editor.addKeybindingRules([
      {
        keybinding:
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR,
        command: null,
      },
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
        command: null,
      },
    ]);
    setEditor(newEditor);
    return () => {
      newEditor.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    monaco,
    language,
    /* we deal with fullOptions updates later on to ensure the theme switch doesn't reset monaco text */
    container,
    expandSuggestionDocs,
  ]);

  useEffect(() => {
    if (!editor) return;
    if (isPlaywrightTest && container.current) {
      //@ts-ignore
      container.current._getValue = () => {
        return editor.getValue();
      };
      //@ts-ignore
      container.current.editorRef = editor;
    }
    onMount?.(editor);
  }, [editor, onMount]);

  useMonacoEditorAddActions(editor, language);

  useEffect(() => {
    if (!editor) return;

    if (onChange) {
      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        if (valueRef.current === newValue) return;
        onChange(newValue, editor, monacoRef.current);
      });
    }
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) return;
    /** For some reason getRawOptions() returns stale theme from time to time */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const theme: string =
      //@ts-ignore
      editor._themeService?.getColorTheme().themeName ?? fullOptions.theme;
    const currentEditorOptions = pickKeys(
      { ...editor.getRawOptions(), theme },
      getKeys(fullOptions as editor.IEditorOptions),
    );
    if (isEqual(currentEditorOptions, fullOptions)) return;
    editor.updateOptions(fullOptions);
  }, [editor, fullOptions]);

  useEffect(() => {
    if (editor && valueIsDifferentFromEditor(value, editor)) {
      editor.setValue(value);
    }
  }, [value, editor]);

  const { className, style } = props;

  const monacoStyle: React.CSSProperties = useMemo(() => {
    if (style) {
      return {
        ...style,
        textAlign: "initial",
      };
    }
    /**
     * automaticLayout does not appear to work so we use this
     */
    return {
      textAlign: "initial",
      minWidth,
      minHeight:
        Math.min(minHeight, (2 + value.trim().split("\n").length) * 20) + "px",
      flex: "f-1",
    };
  }, [style, minWidth, minHeight, value]);

  return (
    <div
      key={`${!!language.length}`}
      ref={container}
      style={monacoStyle}
      data-command={props["data-command"] ?? "MonacoEditor"}
      className={`MonacoEditor  ${className}`}
    />
  );
};

const valueIsDifferentFromEditor = (
  v1: string,
  editor: editor.IStandaloneCodeEditor,
) => {
  const v2 = editor.getValue();
  const valuesDiffer = v1 !== v2;
  try {
    const v2 = editor.getValue();
    if (valuesDiffer) {
      const lang = editor.getModel()?.getLanguageId();
      if (lang !== "json") return valuesDiffer;
      const o1 = JSON.parse(v1) as AnyObject;
      const o2 = JSON.parse(v2) as AnyObject;
      const valuesMatch = isEqual(o1, o2);
      return !valuesMatch;
    }
  } catch {}
  return valuesDiffer;
};

export const MONACO_READONLY_DEFAULT_OPTIONS = {
  minimap: { enabled: false },
  lineNumbers: "off",
  tabSize: 2,
  padding: { top: 10 },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  lineHeight: 19,
  readOnly: true,
  /** prevent long single lines in json strings */
  wordWrap: "on",
  wrappingIndent: "same",
  lineNumbersMinChars: 4,
} satisfies editor.IStandaloneEditorConstructionOptions;
