import { mdiContentCopy, mdiFullscreen } from "@mdi/js";
import type { editor } from "monaco-editor";
import React, { useCallback, useMemo } from "react";
import { CHAT_WIDTH } from "../../dashboard/AskLLM/AskLLM";
import Btn from "../Btn";
import { FlexCol, FlexRow } from "../Flex";
import { MonacoEditor } from "../MonacoEditor/MonacoEditor";
import Popup from "../Popup/Popup";
import type { MarkedProps } from "./Marked";

const LANGUAGE_FALLBACK = {
  tsx: "typescript",
  ts: "typescript",
};

export const MarkdownMonacoCode = (props: {
  title?: string;
  language: string;
  codeString: string;
  codeHeader: MarkedProps["codeHeader"] | undefined;
}) => {
  const { codeHeader, language, codeString, title } = props;
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
        <div className="text-sm text-color-4 f-1 px-1 ">
          {title ?? language}
        </div>
        {codeHeader && codeHeader({ language, codeString })}
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
          language={LANGUAGE_FALLBACK[language] ?? language}
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
