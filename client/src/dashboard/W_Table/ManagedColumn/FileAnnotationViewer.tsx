import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { useMediaFile } from "@components/MediaViewer/useMediaFile";
import { PdfViewerWithFileTableContext } from "@components/PdfViewer/PdfViewerWithFileTableContext";
import Popup from "@components/Popup/Popup";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import { isFileAnnotationPreview } from "./fileAnnotation";
import { mdiLink } from "@mdi/js";

export const FileAnnotationViewer = ({
  value,
  fallbackValue,
  tableName,
  maxCellChars,
}: {
  value: unknown;
  fallbackValue: unknown;
  tableName: string;
  maxCellChars: number;
}) => {
  const prgl = usePrgl();
  const [showPreview, setShowPreview] = useState(false);
  const [headerControlsTarget, setHeaderControlsTarget] =
    useState<HTMLDivElement | null>(null);
  const joinedValue = Array.isArray(value) ? value[0] : value;
  const annotation =
    isFileAnnotationPreview(joinedValue) ? joinedValue : undefined;
  const annotationTable = prgl.tables.find(({ name }) => name === tableName);
  const { url, withCredentials } = useMediaFile(
    annotation ? { fileId: annotation.file_id } : { url: undefined },
  );

  if (!annotation || !annotationTable || !url) {
    return <RenderValue column={undefined} value={fallbackValue} />;
  }

  return (
    <>
      <Btn
        variant="faded"
        className="max-w-full"
        size="small"
        title={annotation.text}
        iconPath={mdiLink}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setShowPreview(true);
        }}
      >
        {sliceText(annotation.text, maxCellChars)}
      </Btn>
      {showPreview && (
        <Popup
          title={sliceText(annotation.text, 100)}
          headerRightContent={<div ref={setHeaderControlsTarget} />}
          positioning="fullscreen"
          contentClassName="p-0"
          onClose={() => setShowPreview(false)}
        >
          <PdfViewerWithFileTableContext
            url={url}
            fileId={annotation.file_id}
            withCredentials={withCredentials}
            headerControlsTarget={headerControlsTarget}
            context={{
              table: annotationTable,
              columnName: "file_id",
              row: annotation,
            }}
          />
        </Popup>
      )}
    </>
  );
};
