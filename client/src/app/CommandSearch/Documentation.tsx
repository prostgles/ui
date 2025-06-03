import React, { useMemo } from "react";
import Markdown from "react-markdown";
import { FlexCol } from "../../components/Flex";
import { getDocumentation } from "./getDocumentation";

export const Documentation = () => {
  const docs = useMemo(() => getDocumentation(), []);
  return (
    <FlexCol
      style={{
        width: "min(100vw, 700px)",
        alignSelf: "center",
        gap: 0,
      }}
    >
      <Markdown>{docs}</Markdown>
    </FlexCol>
  );
};
