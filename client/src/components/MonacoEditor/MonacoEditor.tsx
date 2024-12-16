import {
  useAsyncEffectQueue,
  useEffectDeep,
  usePromise,
} from "prostgles-client/dist/react-hooks";
import * as React from "react";
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
  // useEffectDeep(() => {
  //   if(!props.loadedSuggestions) return;
  //   loadPSQLLanguage(props.loadedSuggestions);
  // }, [props.loadedSuggestions]);

  const loadedLanguage = usePromise(async () => {
    await loadPSQLLanguage(loadedSuggestions);
    return true;
  }, [loadedSuggestions]);

  const editor = React.useRef<editor.IStandaloneCodeEditor>();
  const container = React.useRef<HTMLDivElement>(null);
  const { state: _appTheme } = useReactiveState(appTheme);

  const options = props.options;
  const theme =
    options?.theme && options.theme !== "vs" ? options.theme
    : _appTheme === "dark" ? "vs-dark"
    : (customLightThemeMonaco as any);
  useAsyncEffectQueue(async () => {
    const {
      language,
      value,
      options,
      onMount,
      expandSuggestionDocs = true,
    } = props;

    const monaco = await getMonaco();
    const editorOptions: editor.IStandaloneEditorConstructionOptions = {
      value,
      language,
      ...options,
      theme,
      matchOnWordStartOnly: false,
    };

    if (!container.current) return;

    editor.current = monaco.editor.create(container.current, editorOptions);
    hackyFixOptionmatchOnWordStartOnly(editor.current);
    hackyShowDocumentationBecauseStorageServiceIsBrokenSinceV42(
      editor.current,
      expandSuggestionDocs,
    );
    if (props.onChange) {
      editor.current.onDidChangeModelContent(() => {
        const value = editor.current?.getValue() || "";
        props.onChange?.(value);
      });
    }

    /** This check necessary to ensure getTokens returns correct data */
    if (loadedLanguage) {
      onMount?.(editor.current);
    }
    return () => {
      editor.current?.dispose();
    };
  }, [props.language, container, props.onChange, loadedLanguage]);

  useEffectDeep(() => {
    if (!editor.current) return;
    editor.current.updateOptions({ ...props.options, theme });
  }, [theme, props.options, editor.current]);

  useEffectDeep(() => {
    if (editor.current && props.value !== editor.current.getValue()) {
      editor.current.setValue(props.value);
    }
  }, [props.value, editor.current]);

  const { className, style } = props;
  return (
    <div
      key={`${!!props.language.length}`}
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
