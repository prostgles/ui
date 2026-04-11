import { documentsMcpSchema } from "@common/mcp/documents.mcp.schema";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { mdiEye } from "@mdi/js";
import React, { useMemo, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";
import { useJSONBParsedData } from "../common/useJSONBParsedData";
import { useToolUseResultString } from "../common/useToolUseResultString";
import { Markdown } from "../WebSearch/Markdown";
import { DoclingTable } from "./DoclingTable";
import { DoclingText } from "./DoclingText";
import type { DoclintDocument } from "./DoclintDocument";

export const DoclingConvertedDocument = (props: ProstglesMCPToolsProps) => {
  const {
    dbsMethods: { getDocumentText },
  } = usePrglCore();
  const { resultContent, toolUseContent } = props;
  const { data } = useJSONBParsedData(
    toolUseContent.input,
    documentsMcpSchema.get_document_text.schema,
  );
  const [reparsedJson, setReparsedJson] = useState<DoclintDocument>();
  const str = useToolUseResultString(resultContent);
  const jsonContent = useMemo(() => {
    if (reparsedJson) {
      return reparsedJson;
    }
    if (!str || !data || data.to_format !== "json") return undefined;
    try {
      return JSON.parse(str) as DoclintDocument;
    } catch (e) {
      console.error("Failed to parse JSON content", e);
    }
  }, [data, reparsedJson, str]);

  if (!str?.trim() || str === '""') {
    return <i>No content</i>;
  }
  if (jsonContent) {
    return (
      <FlexCol>
        {Object.values(jsonContent.pages).map((page) => {
          const { image, page_no, size } = page;
          return (
            <FlexCol key={page_no} className="b b-color p-1 gap-1">
              <div>
                Page {page_no} - {Math.round(size.width)}x
                {Math.round(size.height)}
              </div>
              <div
                className="relative"
                style={{
                  width: image.size.width + "px",
                  height: image.size.height + "px",
                }}
              >
                <img
                  src={image.uri}
                  alt={`Page ${page_no}`}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
                <DoclingText texts={jsonContent.texts} page={page} />
                <DoclingTable tables={jsonContent.tables} page={page} />
              </div>
            </FlexCol>
          );
        })}
      </FlexCol>
    );
  }

  return (
    <FlexCol>
      <Markdown {...props} />
      {getDocumentText && data && (
        <Btn
          className="ml-auto"
          iconPath={mdiEye}
          color="action"
          variant="faded"
          onClickPromise={async () => {
            const binary = atob(data.fileAsBase64);
            const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
            const blobWithType = new Blob([bytes], { type: data.contentType });
            const res = await getDocumentText({
              files: [
                {
                  name: "file",
                  data: blobWithType,
                  type: data.contentType,
                },
              ],
              options: {
                image_export_mode: "embedded",
                to_formats: ["json"],
              },
            });
            setReparsedJson(res.document.json_content as DoclintDocument);
          }}
        >
          Show original layout
        </Btn>
      )}
    </FlexCol>
  );
};
