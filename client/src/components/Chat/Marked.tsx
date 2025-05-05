import React, { useCallback, useEffect } from "react";
import Markdown from "react-markdown";
import { classOverride, type DivProps } from "../Flex";
import { MarkdownMonacoCode } from "./MarkdownMonacoCode";
import "./Marked.css";

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
