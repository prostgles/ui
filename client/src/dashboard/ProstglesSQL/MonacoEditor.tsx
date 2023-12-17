import * as monaco from 'monaco-editor';
import * as React from 'react';
import { MONACO_DEFAULT_STORAGE_SERVICE } from "../SQLEditor/SQLEditor";
import { loadPSQLLanguage } from "./MonacoLanguageRegister";


loadPSQLLanguage(monaco);
export type MonacoEditorProps = {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  overrideServices?: monaco.editor.IEditorOverrideServices;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  style?: React.CSSProperties;
}

export class MonacoEditor extends React.Component<MonacoEditorProps> {
  private editor?: monaco.editor.IStandaloneCodeEditor;

  componentDidMount() {
    this.initializeEditor();
  }

  componentDidUpdate(prevProps: MonacoEditorProps) {
    if (prevProps.value !== this.props.value && this.editor) {
      const editorValue = this.editor.getValue();
      if (editorValue !== this.props.value) {
        this.editor.setValue(this.props.value);
      }
    }
  }

  componentWillUnmount() {
    this.disposeEditor();
  }

  render() {
    const { className, style } = this.props;
    return <div style={{ ...style, textAlign: "initial" }} className={`MonacoEditor ${className}`} ref={this.setRef} />;
  }

  private setRef = (container: HTMLDivElement | null) => {
    if (container) {
      this.container = container;
    }
  };

  private container?: HTMLDivElement;

  private initializeEditor() {
    if (this.container) {
      const { language, value, overrideServices = MONACO_DEFAULT_STORAGE_SERVICE, options, onMount } = this.props;

      const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
        value,
        language,
        ...options,
        matchOnWordStartOnly: false,
        // filterGraceful: true,
      };

      this.editor = monaco.editor.create(this.container, editorOptions, { storageService: overrideServices});

      if (this.props.onChange) {
        this.editor.onDidChangeModelContent(() => {
          const value = this.editor?.getValue() || '';
          this.props.onChange?.(value);
        });
      }

      if (onMount) {
        onMount(this.editor);
      }
    }
  }

  private disposeEditor() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = undefined;
    }
  }
}
