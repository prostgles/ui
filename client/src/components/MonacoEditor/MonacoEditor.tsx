import {
  useAsyncEffectQueue,
  usePromise,
} from "prostgles-client/dist/react-hooks";
import { getKeys, isEqual, pickKeys } from "prostgles-types";
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

export const MonacoEditor = (props: MonacoEditorProps) => {
  const { loadedSuggestions } = props;

  const loadedLanguage = usePromise(async () => {
    await loadPSQLLanguage(loadedSuggestions);
    return true;
  }, [loadedSuggestions]);

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
  }, [language, container, fullOptions, expandSuggestionDocs]);

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
    const currentEditorOptions = pickKeys(
      editor.getRawOptions(),
      getKeys(fullOptions) as any,
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
      minHeight:
        Math.min(200, (2 + value.trim().split("\n").length) * 20) + "px",
      flex: "f-1",
    };
  }, [value, style]);

  return (
    <div
      key={`${!!language.length}`}
      ref={container}
      style={monacoStyle}
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
      const o1 = JSON.parse(v1);
      const o2 = JSON.parse(v2);
      const valuesMatch = isEqual(o1, o2);
      return !valuesMatch;
    }
  } catch (error) {}
  return valuesDiffer;
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
