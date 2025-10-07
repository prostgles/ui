import React, { useMemo } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import "./Documentation.css";

import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import {
  getDocumentationFiles,
  type DocumentationFile,
} from "./getDocumentation";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";

type P = {
  isElectron: boolean;
};
export const Documentation = ({ isElectron }: P) => {
  const { docText, docFiles } = useMemo(() => {
    const docFiles = getDocumentationFiles(isElectron);

    const docText = docFiles.map(({ text }) => text).join("\n\n");
    return {
      docText,
      docFiles,
    };
  }, [isElectron]);

  const WrappingElement = window.isLowWidthScreen ? FlexCol : FlexRow;

  return (
    <FlexCol className="Documentation min-s-0 bg-color-0 p-1">
      <WrappingElement
        className="ai-start min-s-0 f-1"
        style={{ alignSelf: "center" }}
      >
        <TableOfContents docFiles={docFiles} />
        <ScrollFade
          scrollRestore={true}
          style={{
            width: "min(100vw, 850px)",
            gap: 0,
            height: "100%",
            overflowY: "auto",
          }}
        >
          <Markdown rehypePlugins={[rehypeRaw]}>{docText}</Markdown>
        </ScrollFade>
      </WrappingElement>
    </FlexCol>
  );
};

const TableOfContents = ({ docFiles }: { docFiles: DocumentationFile[] }) => {
  return (
    <ScrollFade>
      {docFiles.map((docFile) => (
        <div key={docFile.id}>
          <a href={`#${docFile.id}`}>{docFile.title}</a>
        </div>
      ))}
    </ScrollFade>
  );
};
