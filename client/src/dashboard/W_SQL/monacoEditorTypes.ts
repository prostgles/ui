export type Monaco = typeof import(
  /* webpackChunkName: "monaco-editor-api" */ /*  webpackPrefetch: 98 */ "monaco-editor/esm/vs/editor/editor.api"
);
export type {
  IRange,
  languages,
  editor,
  Uri,
  IDisposable,
  Position,
  Token,
  IMarkdownString,
} from "monaco-editor/esm/vs/editor/editor.api";
