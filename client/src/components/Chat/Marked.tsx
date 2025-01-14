import { mdiContentCopy } from "@mdi/js";
import type { editor } from "monaco-editor";
import React, { useCallback, useEffect } from "react";
import Markdown from "react-markdown";
import { CHAT_WIDTH } from "../../dashboard/AskLLM/AskLLM";
import Btn from "../Btn";
import { classOverride, FlexCol, FlexRow, type DivProps } from "../Flex";
import { MonacoEditor } from "../MonacoEditor/MonacoEditor";
import "./Marked.css";

export type MarkedProps = DivProps & {
  content: string;
  codeHeader: (opts: {
    language: string;
    codeString: string;
  }) => React.ReactNode;
};

const monacoOptions = {
  minimap: { enabled: false },
  lineNumbers: "off",
  tabSize: 2,
  padding: { top: 10 },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  lineHeight: 19,
} satisfies editor.IStandaloneEditorConstructionOptions;

export const Marked = (props: MarkedProps) => {
  const { content, codeHeader, ...divProps } = props;
  useEffect(() => {
    if (!content) return;
    window.localStorage.setItem("content", content);
  }, [content]);

  const CodeComponent = useCallback(
    ({
      node,
      className,
      ...props
    }: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & { node?: any }) => {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const codeString = props.children?.toString() ?? "";
      if (!codeString || !className || !language) {
        return <code {...props} />;
      }

      if (language === "markdown") {
        return (
          <pre>
            <code {...props} />
          </pre>
        );
      }

      return (
        <FlexCol
          className="Marked relative b b-color-1 rounded gap-0 b-color-2 f-0 o-hidden"
          style={{
            maxWidth: `${CHAT_WIDTH}px`,
          }}
        >
          <FlexRow className="bg-color-2">
            <div className="text-sm text-color-4 f-1 px-1 ">{language}</div>
            {codeHeader({ language, codeString })}
            <Btn
              iconPath={mdiContentCopy}
              style={{
                marginLeft: "auto",
                flex: "none",
              }}
              onClick={() => {
                navigator.clipboard.writeText(codeString);
              }}
            >
              Copy
            </Btn>
          </FlexRow>
          <MonacoEditor
            loadedSuggestions={undefined}
            value={codeString}
            language={language}
            options={monacoOptions}
          />
        </FlexCol>
      );
    },
    [codeHeader],
  );

  return (
    <Markdown
      {...divProps}
      className={classOverride("Marked", divProps.className)}
      components={{
        pre: React.Fragment as any,
        code: CodeComponent,
      }}
    >
      {content}
    </Markdown>
  );
};
