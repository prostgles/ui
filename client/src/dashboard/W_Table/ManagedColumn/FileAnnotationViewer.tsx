import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import { SmartForm } from "../../SmartForm/SmartForm";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";
import { isFileAnnotationPreview } from "./fileAnnotation";
import { mdiLink } from "@mdi/js";
import type { AnnotationsTableRow } from "@components/MediaViewer/managedTableUtils";

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
  const [showForm, setShowForm] = useState(false);
  const joinedValue = Array.isArray(value) ? value[0] : value;
  const annotation =
    isFileAnnotationPreview(joinedValue) ? joinedValue : undefined;

  if (!annotation) {
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
          setShowForm(true);
        }}
      >
        {sliceText(annotation.text, maxCellChars)}
      </Btn>
      {showForm && (
        <SmartForm
          {...prgl}
          asPopup={true}
          tableName={tableName}
          rowFilter={[
            {
              fieldName: "id" satisfies keyof AnnotationsTableRow,
              value: annotation.id,
            },
          ]}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
};
