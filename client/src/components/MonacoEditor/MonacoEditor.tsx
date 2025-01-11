import {
  useAsyncEffectQueue,
  usePromise,
} from "prostgles-client/dist/react-hooks";
import React, { useEffect, useMemo } from "react";
import { appTheme, useReactiveState } from "../../App";
import type { LoadedSuggestions } from "../../dashboard/Dashboard/dashboardUtils";
import { hackyFixOptionmatchOnWordStartOnly } from "../../dashboard/SQLEditor/SQLCompletion/registerSuggestions";
import {
  customLightThemeMonaco,
  getMonaco,
} from "../../dashboard/SQLEditor/SQLEditor";
import type { editor } from "../../dashboard/W_SQL/monacoEditorTypes";
import { loadPSQLLanguage } from "../../dashboard/W_SQL/MonacoLanguageRegister";
import { useWhyDidYouUpdate } from "./useWhyDidYouUpdate";
export type MonacoEditorProps = {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  /**
   * @default true
   */
  expandSuggestionDocs?: boolean;
  options?: editor.IStandaloneEditorConstructionOptions;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  style?: React.CSSProperties;
  loadedSuggestions: LoadedSuggestions | undefined;
};

let renders = 0;
let lastChecked = Date.now();

export const MonacoEditor = (props: MonacoEditorProps) => {
  const { loadedSuggestions } = props;

  const now = Date.now();
  if (lastChecked + 100 < now) {
    if (renders > 100) {
      console.error(`MonacoEditor renders too much: ${renders}/100ms`);
    }
    lastChecked = Date.now();
    renders = 0;
  }
  renders++;

  useWhyDidYouUpdate("MonacoEditor", props);

  const loadedLanguage = usePromise(async () => {
    await loadPSQLLanguage(loadedSuggestions);
    return true;
  }, [loadedSuggestions]);

  // const editor = React.useRef<editor.IStandaloneCodeEditor>();
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
  } = props;

  const valueRef = React.useRef(value);

  const fullOptions = useMemo(() => {
    const theme =
      options?.theme && options.theme !== "vs" ? options.theme
      : _appTheme === "dark" ? "vs-dark"
      : (customLightThemeMonaco as any);
    return {
      ...options,
      theme,
    };
  }, [_appTheme, options]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffectQueue(async () => {
    if (!container.current) return;
    const monaco = await getMonaco();
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

    setEditor(newEditor);
    return () => {
      newEditor.dispose();
    };
  }, [
    language,
    container,
    onChange,
    onMount,
    fullOptions,
    expandSuggestionDocs,
  ]);

  useEffect(() => {
    if (!editor) return;

    /** This check necessary to ensure getTokens returns correct data */
    if (loadedLanguage) {
      onMount?.(editor);
    }
  }, [editor, onMount, loadedLanguage]);

  useEffect(() => {
    if (!editor) return;

    if (onChange) {
      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        if (valueRef.current === newValue) return;
        onChange(newValue);
      });
    }
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor) return;
    editor.updateOptions(fullOptions);
  }, [editor, fullOptions]);

  useEffect(() => {
    if (editor && value !== editor.getValue()) {
      editor.setValue(value);
    }
  }, [value, editor]);

  const { className, style } = props;
  return (
    <div
      key={`${!!language.length}`}
      ref={container}
      style={{
        ...style,
        textAlign: "initial",
      }}
      className={`MonacoEditor ${className}`}
    />
  );
};

const hackyShowDocumentationBecauseStorageServiceIsBrokenSinceV42 = (
  editor: editor.IStandaloneCodeEditor,
  expandSuggestionDocs = true,
) => {
  const sc = editor.getContribution("editor.contrib.suggestController") as any;
  if (sc?.widget) {
    const suggestWidget = sc.widget.value;
    if (suggestWidget && suggestWidget._setDetailsVisible) {
      // This will default to visible details. But when user switches it off
      // they will remain switched off:
      suggestWidget._setDetailsVisible(expandSuggestionDocs);
    }
    // I also wanted my widget to be shorter by default:
    if (suggestWidget && suggestWidget._persistedSize) {
      // suggestWidget._persistedSize.store({width: 200, height: 256});
    }
  }
};
