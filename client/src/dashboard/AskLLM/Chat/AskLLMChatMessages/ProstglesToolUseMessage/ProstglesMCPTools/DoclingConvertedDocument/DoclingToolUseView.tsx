import { documentsMcpSchema } from "@common/mcp/documents.mcp.schema";
import React, { useMemo } from "react";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { useToolUseResultString } from "../common/useToolUseResultString";
import type { DoclingDocument } from "./DoclingDocument";
import { DoclingDocumentViewer } from "./DoclingDocumentViewer";

export const DoclingToolUseView = (props: ProstglesMCPToolsProps) => {
  const { resultContent, toolUseContent } = props;
  const { data } = useJSONBParsedData(
    toolUseContent.input,
    documentsMcpSchema.get_document_text.schema,
  );
  const str = useToolUseResultString(resultContent);
  const jsonContent = useMemo(() => {
    if (!str || !data || data.to_format !== "json") return undefined;
    try {
      return JSON.parse(str) as DoclingDocument;
    } catch (e) {
      console.error("Failed to parse JSON content", e);
    }
  }, [data, str]);

  const fileData = useMemo(() => {
    if (!data) return undefined;
    const binary = atob(data.fileAsBase64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const blobWithType = new Blob([bytes], { type: data.contentType });
    return {
      blobWithType,
      contentType: data.contentType,
    };
  }, [data]);

  if (!str?.trim() || str === '""') {
    return <i>No content</i>;
  }

  return (
    <DoclingDocumentViewer
      data={fileData}
      document={jsonContent}
      markdownContent={str}
    />
  );
};
