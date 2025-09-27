import React, { useMemo } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import "./Documentation.css";

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
    <div
      className="Documentation"
      style={{
        width: "min(100vw, 850px)",
        alignSelf: "center",
        gap: 0,
      }}
    >
      <Markdown rehypePlugins={[rehypeRaw]}>{documentationText}</Markdown>
    </div>
  );
};
