
import React, { useEffect } from "react";
import Markdown from "react-markdown";
import { MonacoEditor } from "../MonacoEditor/MonacoEditor";
import { classOverride, FlexCol, FlexRow, type DivProps } from "../Flex";
import Btn from "../Btn";
import { mdiContentCopy } from "@mdi/js";
import "./Marked.css";
import { CHAT_WIDTH } from "../../dashboard/AskLLM/AskLLM";

type P = DivProps & { 
  content: string;
  codeHeader: (opts: { language: string, codeString: string; }) => React.ReactNode;
};
export const Marked = ({ content, codeHeader, ...divProps }: P) => {
  
  useEffect(() => {
    if(!content) return
    window.localStorage.setItem("content", content);
  }, [content])
  return <Markdown 
    {...divProps}
    className={classOverride("Marked", divProps.className)} 
    components={{
      pre: React.Fragment as any,
      code: ({ node, className, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "";
        const codeString = props.children?.toString() ?? "";
        if(!codeString || !className || !language) {
          return <code {...props} />;
        }

        if(language === "markdown"){
          return <pre>
            <code {...props} />
          </pre>
        }

        return <FlexCol 
          className="relative b b-color-1 rounded gap-0 b-color-2 f-0 o-hidden"
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
            >Copy</Btn>
          </FlexRow>
          <MonacoEditor 
            style={{ 
              minHeight: Math.min(200, (2 + codeString.trim().split("\n").length) * 20) + "px",
              flex: "none" 
            }} 
            loadedSuggestions={undefined} 
            value={codeString} 
            language={language}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              tabSize: 2,
              padding: { top: 10 },
              scrollBeyondLastLine: false,
            }}
          />
        </FlexCol>
      },
    }}>{content}</Markdown>
}