import Anser from "anser";
import type { editor } from "monaco-editor";
import type { Monaco } from "src/dashboard/W_SQL/monacoEditorTypes";

type AnsiSpan = {
  /** Plain text (no escape codes) */
  text: string;
  fg: string | null;
  bg: string | null;
  bold: boolean;
};

const parseAnsiSpans = (raw: string): AnsiSpan[] => {
  const entries = Anser.ansiToJson(raw, {
    use_classes: false,
    remove_empty: true,
  });

  return entries
    .filter((e) => e.content.length > 0)
    .map((e) => ({
      text: e.content,
      fg: e.fg,
      bg: e.bg,
      bold: e.decoration === "bold",
    }));
};

const stripAnsi = (raw: string): string =>
  Anser.ansiToJson(raw, { use_classes: false, remove_empty: false })
    .map((e) => e.content)
    .join("");

const buildDecorations = (
  monaco: Monaco,
  rawText: string,
): editor.IModelDeltaDecoration[] => {
  const decorations: editor.IModelDeltaDecoration[] = [];

  // Process line-by-line so positions map cleanly to Monaco's 1-based grid.
  const rawLines = rawText.split("\n");

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
    const rawLine = rawLines[lineIdx]!;
    const spans = parseAnsiSpans(rawLine);

    const monacoLine = lineIdx + 1; // Monaco lines are 1-based
    let col = 1; // Monaco columns are 1-based

    for (const span of spans) {
      if (!span.fg && !span.bg && !span.bold) {
        // No styling – just advance the column cursor.
        col += span.text.length;
        continue;
      }

      const startCol = col;
      const endCol = col + span.text.length;

      const cssProps: string[] = [];
      if (span.fg) cssProps.push(`color: rgb(${span.fg})`);
      if (span.bg) cssProps.push(`background-color: rgb(${span.bg})`);
      if (span.bold) cssProps.push(`font-weight: bold`);

      decorations.push({
        range: new monaco.Range(monacoLine, startCol, monacoLine, endCol),
        options: {
          // Monaco supports arbitrary inline styles via `before` content hacks,
          // but the cleanest approach for colours is a generated CSS class.
          // We use `inlineClassName` with a dynamically injected stylesheet.
          inlineClassName: registerStyle(cssProps.join("; ")),
        },
      });

      col = endCol;
    }
  }

  return decorations;
};

// ── Dynamic CSS class registry ───────────────────────────────────────────────

const styleCache = new Map<string, string>();
let styleSheet: CSSStyleSheet | null = null;
let classCounter = 0;

const getOrCreateSheet = (): CSSStyleSheet => {
  if (styleSheet) return styleSheet;
  const el = document.createElement("style");
  el.id = "ansi-log-monaco-styles";
  document.head.appendChild(el);
  styleSheet = el.sheet;
  if (!styleSheet) {
    throw new Error("Failed to create stylesheet for ANSI log styles");
  }
  return styleSheet;
};

/**
 * Return a CSS class name for the given inline style string.
 * Classes are created once and reused.
 */
const registerStyle = (cssText: string): string => {
  const cached = styleCache.get(cssText);
  if (cached) return cached;

  const className = `ansi-log-${++classCounter}`;
  const sheet = getOrCreateSheet();
  sheet.insertRule(`.${className} { ${cssText} }`, sheet.cssRules.length);
  styleCache.set(cssText, className);
  return className;
};

/** Decoration collection IDs keyed by editor instance. */
const decorationCollections = new WeakMap<
  editor.IStandaloneCodeEditor,
  editor.IEditorDecorationsCollection
>();

/**
 * Apply ANSI colour decorations to a Monaco editor whose content contains
 * raw ANSI escape codes.
 *
 * Call this once after setting the model value, or inside an
 * `onDidChangeModelContent` listener for streaming logs.
 *
 * The function mutates the editor model to replace ANSI codes with plain text
 * (on first call) so Monaco doesn't render the raw escape sequences.
 */
export const applyAnsiDecorations = (
  monaco: Monaco,
  editor: editor.IStandaloneCodeEditor,
  rawVal: string,
): void => {
  const model = editor.getModel();
  if (!model) return;

  const raw = rawVal; //model.getValue();

  // Replace ANSI codes with plain text in the model (idempotent after first
  // call because the model already contains plain text).
  const plain = stripAnsi(raw);
  if (plain !== raw) {
    // Preserve cursor / scroll position while updating content.
    const viewState = editor.saveViewState();
    model.setValue(plain);
    if (viewState) editor.restoreViewState(viewState);
  }

  // Build decorations against the original raw text (before stripping) so
  // span positions still align with the now-plain model content.
  const newDecorations = buildDecorations(monaco, raw);

  // Get or create a decoration collection for this editor.
  let collection = decorationCollections.get(editor);
  if (!collection) {
    collection = editor.createDecorationsCollection();
    decorationCollections.set(editor, collection);
  }

  collection.set(newDecorations);
};
