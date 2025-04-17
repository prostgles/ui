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

const MarkdownMonacoCode = (
  props: Pick<MarkedProps, "codeHeader"> & {
    language: string;
    codeString: string;
  },
) => {
  const { codeHeader, language, codeString } = props;
  const [fullscreen, setFullscreen] = React.useState(false);

  const monacoOptions = useMemo(() => {
    return {
      minimap: { enabled: false },
      lineNumbers: fullscreen ? "on" : "off",
      tabSize: 2,
      padding: { top: 10 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineHeight: 19,
    } satisfies editor.IStandaloneEditorConstructionOptions;
  }, [fullscreen]);

  const onExit = useCallback(() => {
    setFullscreen(false);
  }, []);

  return (
    <FlexCol
      className="MarkdownMonacoCode relative o-dvisible min-w-600 b b-color-1 rounded gap-0 b-color-2 f-0 o-hidden"
      style={{
        maxWidth: `${CHAT_WIDTH}px`,
      }}
    >
      <FlexRow className="bg-color-2 p-p25">
        <div className="text-sm text-color-4 f-1 px-1 ">{language}</div>
        {codeHeader({ language, codeString })}
        <Btn
          size="small"
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
        <Btn
          title="Toggle Fullscreen"
          iconPath={mdiFullscreen}
          onClick={() => setFullscreen(!fullscreen)}
        />
      </FlexRow>
      <FullscreenWrapper
        key={codeString}
        isFullscreen={fullscreen}
        title={language}
        onExit={onExit}
      >
        <MonacoEditor
          key={codeString}
          className={fullscreen ? "f-1" : ""}
          loadedSuggestions={undefined}
          value={codeString}
          language={language}
          options={monacoOptions}
        />
      </FullscreenWrapper>
    </FlexCol>
  );
};

const FullscreenWrapper = (props: {
  isFullscreen: boolean;
  onExit: VoidFunction;
  children: React.ReactNode;
  title: string;
}) => {
  const { children, isFullscreen, onExit, title } = props;

  if (!isFullscreen) {
    return children;
  }
  return (
    <Popup
      title={title}
      positioning="fullscreen"
      onClickClose={false}
      onClose={onExit}
      contentStyle={{
        overflow: "visible",
      }}
    >
      {children}
    </Popup>
  );
};
