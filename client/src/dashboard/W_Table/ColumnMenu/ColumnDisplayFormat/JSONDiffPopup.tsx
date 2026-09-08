import { SegmentedToggle } from "@components/SegmentedToggle";
import { mdiViewColumn, mdiViewStream } from "@mdi/js";
import type { editor } from "monaco-editor";
import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getMonaco } from "../../../SQLEditor/W_SQLEditor";

type Props = {
  oldValue: unknown;
  newValue: unknown;
  language: "json" | "plaintext";
};

export const JSONDiffPopup = (props: Props) => {
  const { oldValue, newValue, language } = props;
  const title = language === "plaintext" ? "Text diff" : "JSON diff";
  const summary = useMemo(
    () => getChangeSummary(oldValue, newValue, language),
    [oldValue, newValue, language],
  );
  return (
    <PopupMenu
      title={title}
      positioning="fullscreen"
      onClickClose={false}
      button={
        <Btn
          title={`View ${title}`}
          className="ta-left"
          style={{ fontWeight: "normal" }}
          color="inherit"
          variant="text"
        >
          {summary}
        </Btn>
      }
    >
      <JSONDiff {...props} />
    </PopupMenu>
  );
};

const JSONDiff = ({ oldValue, newValue, language }: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [diffEditor, setDiffEditor] = useState<editor.IStandaloneDiffEditor>();
  const [layout, setLayout] = useState<"inline" | "sideBySide">("inline");
  useEffect(() => {
    let disposed = false;
    let dispose: (() => void) | undefined;
    void getMonaco().then((monaco) => {
      if (disposed || !container.current) return;
      const original = monaco.editor.createModel(
        formatDiffValue(oldValue, language),
        language,
      );
      const modified = monaco.editor.createModel(
        formatDiffValue(newValue, language),
        language,
      );
      const editor = monaco.editor.createDiffEditor(container.current, {
        readOnly: true,
        ignoreTrimWhitespace: false,
        automaticLayout: true,
        renderSideBySide: false,
        useInlineViewWhenSpaceIsLimited: false,
        scrollBeyondLastLine: false,
        originalEditable: false,
        minimap: { enabled: false },
      });
      setDiffEditor(editor);
      editor.setModel({ original, modified });
      dispose = () => {
        editor.dispose();
        original.dispose();
        modified.dispose();
      };
    });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [oldValue, newValue, language]);

  useEffect(() => {
    diffEditor?.updateOptions({ renderSideBySide: layout === "sideBySide" });
  }, [diffEditor, layout]);

  return (
    <div className="flex-col f-1 min-h-0 min-w-0 ta-left">
      <SegmentedToggle
        className="w-fit m-1"
        value={layout}
        onChange={setLayout}
        options={{
          inline: {
            title: "Inline diff",
            children: "Inline",
            iconPath: mdiViewStream,
          },
          sideBySide: {
            title: "Side-by-side diff",
            children: "Side by side",
            iconPath: mdiViewColumn,
          },
        }}
      />
      {layout === "sideBySide" && (
        <div className="flex-row gap-1 p-1">
          <div className="f-1">Before</div>
          <div className="f-1">After</div>
        </div>
      )}
      <div ref={container} className="f-1 min-w-0" style={{ minHeight: 300 }} />
    </div>
  );
};

const formatJSON = (value: unknown): string => {
  if (value == null) return "";
  return JSON.stringify(
    value,
    (_key, item: unknown) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        );
      }
      return item;
    },
    2,
  );
};

const getChangeSummary = (
  oldValue: unknown,
  newValue: unknown,
  language: Props["language"],
) => {
  if (language === "plaintext") return "View diff";
  const before = asPropertyMap(oldValue);
  const after = asPropertyMap(newValue);
  const changedKeys = [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ].filter(
    (key) =>
      !Object.hasOwn(before, key) ||
      !Object.hasOwn(after, key) ||
      formatJSON(before[key]) !== formatJSON(after[key]),
  );
  if (!changedKeys.length) return "No changes";
  return (
    <span className="flex-col gap-p25">
      {changedKeys.map((key) => (
        <span key={key}>
          <strong>{key}</strong>{" "}
          {Object.hasOwn(before, key) && Object.hasOwn(after, key) ?
            <>
              <del>{formatSummaryValue(before[key])}</del>
              {"   "}
              <span>{formatSummaryValue(after[key])}</span>
            </>
          : <span>
              {formatSummaryValue(
                Object.hasOwn(after, key) ? after[key] : before[key],
              )}
            </span>
          }
        </span>
      ))}
    </span>
  );
};

const asPropertyMap = (value: unknown): Record<string, unknown> => {
  if (value == null) return {};
  return typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : { value };
};

const formatSummaryValue = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
};

const formatDiffValue = (
  value: unknown,
  language: Props["language"],
): string => {
  if (language === "json") return formatJSON(value);
  return (
    typeof value === "string" ? value
    : value == null ? ""
    : formatJSON(value)
  );
};
