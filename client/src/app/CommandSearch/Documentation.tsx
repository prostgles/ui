import React from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { FlexCol } from "../../components/Flex";
import { documentationText } from "./getDocumentation";

export const Documentation = () => {
  return (
    <FlexCol
      style={{
        width: "min(100vw, 700px)",
        alignSelf: "center",
        gap: 0,
      }}
    >
      <Markdown rehypePlugins={[rehypeRaw]}>{documentationText}</Markdown>
    </FlexCol>
  );
};
