import React from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { ScrollFade } from "../../components/ScrollFade/ScrollFade";
import { getDocumentationFiles } from "./getDocumentation";

export const documentationText = getDocumentationFiles()
  .map(({ text }) => text)
  .join("\n\n");

export const Documentation = () => {
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
