import React, { useMemo } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import "./Documentation.css";

import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { useTypedSearchParams } from "src/hooks/useTypedSearchParams";
import { getDocumentationFiles } from "./getDocumentation";

type P = {
  isElectron: boolean;
};
export const Documentation = ({ isElectron }: P) => {
  const { docFiles, docFilesMap } = useMemo(() => {
    const docFiles = getDocumentationFiles(isElectron).map((d) => ({
      ...d,
      text: d.text.replaceAll(`="./screenshots/`, `="/screenshots/`),
    }));
    const docFilesMap = new Map(docFiles.map((d) => [d.id, d]));
    return {
      docFiles,
      docFilesMap,
    };
  }, [isElectron]);

  const [{ section = docFiles[0]?.id }, setParams] = useTypedSearchParams({
    section: { type: "string", optional: true },
  });

  const currentDocFile = section ? docFilesMap.get(section) : undefined;

  const WrappingElement = window.isLowWidthScreen ? FlexCol : FlexRow;

  return (
    <FlexCol className="Documentation min-s-0 bg-color-0 p-1">
      <WrappingElement
        className="ai-start min-s-0 f-1"
        style={{ alignSelf: "center" }}
      >
        <ScrollFade role="navigation">
          {docFiles.map((docFile) => (
            <Btn
              role="menuitem"
              style={{ width: "100%" }}
              key={docFile.id}
              aria-current={section === docFile.id}
              variant={section === docFile.id ? "faded" : undefined}
              onClick={() => setParams({ section: docFile.id })}
            >
              {docFile.title}
            </Btn>
          ))}
        </ScrollFade>
        <ScrollFade
          scrollRestore={true}
          style={{
            width: "min(100vw, 850px)",
            gap: 0,
            height: "100%",
            overflowY: "auto",
          }}
        >
          {!currentDocFile ? null : (
            <Markdown rehypePlugins={[rehypeRaw]}>
              {currentDocFile.text}
            </Markdown>
          )}
        </ScrollFade>
      </WrappingElement>
    </FlexCol>
  );
};
