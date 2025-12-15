import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { FlexCol, FlexRow } from "@components/Flex";
import React from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useTypedToolUseResultData } from "../common/useTypedToolUseResultData";
import { Favicon } from "./Favicon";
const schema =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["websearch"]["websearch"]["outputSchema"];

export const WebSearch = ({
  toolUseResult: toolResult,
}: ProstglesMCPToolsProps) => {
  const toolUseResult = useTypedToolUseResultData(
    toolResult?.toolUseResultMessage,
    schema,
  );

  return (
    <FlexCol>
      {toolUseResult && toolUseResult.length === 0 && (
        <div style={{ color: "var(--gray)" }}>No results found.</div>
      )}
      {toolUseResult?.map((result, index) => {
        return (
          <FlexCol
            key={index}
            style={{ lineHeight: "1.2em" }}
            className="gap-p5"
          >
            <FlexRow className="gap-p5">
              <Favicon url={result.url} />
              <FlexCol className="gap-0">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "var(--blue)",
                  }}
                >
                  {result.title}
                </a>
                <div style={{ fontSize: "12px", color: "var(--green)" }}>
                  {result.url}
                </div>
              </FlexCol>
            </FlexRow>
            <div style={{ color: "var(--gray)" }}>{result.content}</div>
          </FlexCol>
        );
      })}
    </FlexCol>
  );
};
