import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { FlexCol, FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import React from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { useTypedToolUseResultDataV2 } from "../common/useTypedToolUseResultData";
import { Favicon } from "./Favicon";
const inputSchema =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["web"]["websearch"]["schema"];
const schema =
  PROSTGLES_MCP_SERVERS_AND_TOOLS["web"]["websearch"]["outputSchema"];

export const WebSearch = ({
  toolUseContent,
  resultContent,
}: ProstglesMCPToolsProps) => {
  const toolUse = useJSONBParsedData(toolUseContent.input, inputSchema);
  const toolUseResult = useTypedToolUseResultDataV2(resultContent, schema);
  const toolUseResultData = toolUseResult?.data;
  return (
    <ScrollFade
      className="o-auto flex-col gap-p5"
      style={{
        maxHeight: "70vh",
      }}
    >
      {toolUse.data && (
        <FlexRow className="min-w-0 py-1 ai-start">
          <div className="ws-nowrap">Search query:</div>
          <div className="text-ellipsis f-1 min-w-0">{toolUse.data.q}</div>
        </FlexRow>
      )}
      {toolUseResultData && toolUseResultData.length === 0 && (
        <div className="text-1">No results found.</div>
      )}
      {toolUseResultData?.map((result, index) => {
        return (
          <FlexCol
            key={index}
            style={{ lineHeight: "1.2em" }}
            className="gap-p5"
          >
            <FlexRow className="gap-p5">
              <Favicon className="as-start" url={result.url} />
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
    </ScrollFade>
  );
};
