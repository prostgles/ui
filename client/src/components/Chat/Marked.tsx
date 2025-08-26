import React, { useCallback, useEffect } from "react";
import Markdown from "react-markdown";
import { classOverride, FlexCol, type DivProps } from "../Flex";
import {
  MarkdownMonacoCode,
  type MarkdownMonacoCodeProps,
} from "./MarkdownMonacoCode";
import "./Marked.css";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";

export type MarkedProps = DivProps &
  Pick<
    MarkdownMonacoCodeProps,
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
        components={{
          pre: React.Fragment as any,
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
