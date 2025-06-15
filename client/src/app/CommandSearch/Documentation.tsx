import React from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { ScrollFade } from "../../components/SearchList/ScrollFade";
import { documentationText } from "./getDocumentation";

export const Documentation = () => {
  return (
    <ScrollFade
      className="oy-auto"
      style={{
        width: "min(100vw, 700px)",
        alignSelf: "center",
        gap: 0,
      }}
    >
      <Markdown rehypePlugins={[rehypeRaw]}>{documentationText}</Markdown>
    </ScrollFade>
  );
};
