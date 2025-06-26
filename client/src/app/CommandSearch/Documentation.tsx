import React, { useMemo } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { ScrollFade } from "../../components/ScrollFade/ScrollFade";
import { getDocumentationFiles } from "./getDocumentation";

type P = {
  isElectron: boolean;
};
export const Documentation = ({ isElectron }: P) => {
  const documentationText = useMemo(
    () =>
      getDocumentationFiles(isElectron)
        .map(({ text }) => text)
        .join("\n\n"),
    [isElectron],
  );
  return (
    <ScrollFade
      className="oy-auto"
      style={{
        width: "min(100vw, 850px)",
        alignSelf: "center",
        gap: 0,
      }}
    >
      <Markdown rehypePlugins={[rehypeRaw]}>{documentationText}</Markdown>
    </ScrollFade>
  );
};
