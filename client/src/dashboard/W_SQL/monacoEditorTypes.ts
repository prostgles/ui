export type Monaco =
  typeof import(/* webpackChunkName: "monaco-editor/esm/vs/editor/editor.api.js" */ /*  webpackPrefetch: true */ "monaco-editor/esm/vs/editor/editor.api.js");
export type {
  IRange,
  languages,
  editor,
  Uri,
  IDisposable,
  Position,
  Token,
  IMarkdownString,
} from "monaco-editor/esm/vs/editor/editor.api.js";
