import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { MarkdownWithPlugins } from "@components/MarkdownWithPlugins/MarkdownWithPlugins";
import { mdiEye } from "@mdi/js";
import React, { useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { DoclingDocument } from "./DoclingDocument";
import { DoclingTable } from "./DoclingTable";
import { DoclingText } from "./DoclingText";
import PopupMenu from "@components/PopupMenu";

type P = {
  document: DoclingDocument | undefined;
  markdownContent: string;
  data:
    | {
        blobWithType: Blob;
        contentType: string;
      }
    | undefined;
};

export const DoclingDocumentViewer = ({
  data,
  document: documentFromProps,
  markdownContent,
}: P) => {
  const {
    dbsMethods: { getDocumentText },
  } = usePrglCore();
  const [reparsedJson, setReparsedJson] = useState<DoclingDocument>();
  const document = reparsedJson || documentFromProps;
  if (document) {
    return (
      <FlexCol className="relative gap-2 o-auto p-1 max-w-full min-w-0">
        {Object.values(document.pages).map((page) => {
          const { image, page_no, size } = page;
          const displaySize = image?.size ?? size;
          return (
            <FlexCol key={page_no} className="b b-color p-1 gap-1">
              <div>
                Page {page_no} - {Math.round(size.width)}x
                {Math.round(size.height)}
              </div>
              <div
                className="relative docling-page-content"
                style={{
                  // width: displaySize.width + "px",
                  // height: displaySize.height + "px",
                  width: "100%",
                  aspectRatio: `${displaySize.width} / ${displaySize.height}`,
                }}
              >
                {image && (
                  <img
                    src={image.uri}
                    alt={`Page ${page_no}`}
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                )}
                <DoclingText texts={document.texts} page={page} />
                <DoclingTable tables={document.tables} page={page} />
              </div>
            </FlexCol>
          );
        })}
      </FlexCol>
    );
  }

  return (
    <FlexCol>
      <MarkdownWithPlugins content={markdownContent} />
      {getDocumentText && data && (
        <Btn
          className="ml-auto"
          iconPath={mdiEye}
          color="action"
          variant="faded"
          onClickPromise={async () => {
            const res = await getDocumentText({
              files: [
                {
                  name: "file",
                  data: data.blobWithType,
                  type: data.contentType,
                },
              ],
              options: {
                image_export_mode: "embedded",
                to_formats: ["json"],
              },
            });
            setReparsedJson(res.document.json_content as DoclingDocument);
          }}
        >
          Show original layout
        </Btn>
      )}
    </FlexCol>
  );
};

export const DoclingDocumentViewerPopupBtn = (props: P) => {
  return (
    <PopupMenu
      title="Parsed document"
      positioning="fullscreen"
      onClickClose={false}
      button={
        <Btn iconPath={mdiEye} color="action" variant="faded">
          Show parsed document
        </Btn>
      }
    >
      <DoclingDocumentViewer {...props} />
    </PopupMenu>
  );
};
