import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import React, { useCallback } from "react";
import Markdown from "react-markdown";
import { classOverride, type DivProps } from "../Flex";
import {
  MonacoCodeInMarkdown,
  type MonacoCodeInMarkdownProps,
} from "./MonacoCodeInMarkdown/MonacoCodeInMarkdown";
import "./Marked.css";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export type MarkedProps = DivProps &
  Pick<
    MonacoCodeInMarkdownProps,
    "codeHeader" | "sqlHandler" | "loadedSuggestions"
  > & {
    content: string;
  };

export const Marked = (props: MarkedProps) => {
  const { content, codeHeader, sqlHandler, loadedSuggestions, ...divProps } =
    props;

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
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const codeString = props.children?.toString() ?? "";

      if (!codeString || !className || !language || language === "markdown") {
        const isSingleWord =
          !codeString.includes("\n") && !codeString.includes(" ");

        if (isSingleWord) {
          <code {...props} />;
        }
        return (
          <code {...props} style={{ ...props.style, whiteSpace: "pre-line" }} />
        );
      }

      return (
        <MonacoCodeInMarkdown
          className="my-1"
          key={codeString}
          codeHeader={codeHeader}
          language={language}
          codeString={codeString}
          sqlHandler={sqlHandler}
          loadedSuggestions={loadedSuggestions}
        />
      );
    },
    [codeHeader, sqlHandler, loadedSuggestions],
  );

  return (
    <ScrollFade
      {...divProps}
      className={classOverride(
        "Marked flex-col o-auto min-w-0 max-w-full",
        divProps.className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre: React.Fragment,
          code: CodeComponent,
          a: (props) => (
            <a
              {...props}
              className="link"
              target={props.href?.startsWith("#") ? undefined : "_blank"}
              rel={props.href?.startsWith("#") ? undefined : "noreferrer"}
            />
          ),
        }}
      >
        {content}
      </Markdown>
    </ScrollFade>
  );
};
