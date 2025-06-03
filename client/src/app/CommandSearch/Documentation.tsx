import React, { useMemo } from "react";
import Markdown from "react-markdown";
import { FlexCol } from "../../components/Flex";
import { documentation } from "./getDocumentation";

export const Documentation = () => {
  return (
    <FlexCol
      style={{
        width: "min(100vw, 700px)",
        alignSelf: "center",
        gap: 0,
      }}
    >
      <Markdown>{documentation}</Markdown>
    </FlexCol>
  );
};
