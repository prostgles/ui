import { mdiContentCopy, mdiFullscreen } from "@mdi/js";
import type { editor } from "monaco-editor";
import React, { useCallback, useEffect, useMemo } from "react";
import Markdown from "react-markdown";
import { CHAT_WIDTH } from "../../dashboard/AskLLM/AskLLM";
import Btn from "../Btn";
import { classOverride, FlexCol, FlexRow, type DivProps } from "../Flex";
import { MonacoEditor } from "../MonacoEditor/MonacoEditor";
import Popup from "../Popup/Popup";
import "./Marked.css";
import { MarkdownMonacoCode } from "./MarkdownMonacoCode";

export type MarkedProps = DivProps & {
  content: string;
  codeHeader: (opts: {
    language: string;
    codeString: string;
  }) => React.ReactNode;
};

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
        <MarkdownMonacoCode
          key={codeString}
          codeHeader={codeHeader}
          language={language}
          codeString={codeString}
        />
      );
    },
    [codeHeader],
  );

  return (
    <Markdown
      {...divProps}
      className={classOverride("Marked min-w-0 max-w-full", divProps.className)}
      components={{
        pre: React.Fragment as any,
        code: CodeComponent,
      }}
    >
      {content}
    </Markdown>
  );
};
