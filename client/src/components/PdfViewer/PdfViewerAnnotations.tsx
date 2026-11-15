import { DEFAULT_ANNOTATION_COLOR } from "@common/managedTableSchema";
import { InfoRow } from "@components/InfoRow";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import {
  SmartCardList,
  type SmartCardListProps,
} from "src/dashboard/SmartCardList/SmartCardList";
import type { AnnotationsTableRow } from "../MediaViewer/managedTableUtils";

export const PdfViewerAnnotations = ({
  tableName,
  fileId,
  fileVersion,
  selectedAnnotationId,
  scrollToAnnotation,
  hoveredAnnotationId,
  onHoverAnnotation,
  selectedAnnotationColor,
  hoveredAnnotationColor,
  onSelectAnnotation,
}: {
  tableName: string;
  fileId: string;
  fileVersion: number | null;
  selectedAnnotationId: number | undefined;
  scrollToAnnotation: SmartCardListProps["scrollToRow"];
  hoveredAnnotationId: number | undefined;
  onHoverAnnotation: (annotationId: number | undefined) => void;
  selectedAnnotationColor: string | undefined;
  hoveredAnnotationColor: string | undefined;
  onSelectAnnotation: (annotationId: number) => void;
}) => {
  const prgl = usePrgl();
  return (
    <SmartCardList<AnnotationsTableRow>
      {...prgl}
      tableName={tableName}
      hideColumns={
        ["file_id", "file_version"] satisfies (keyof AnnotationsTableRow)[]
      }
      filter={{ file_id: fileId, file_version: fileVersion }}
      orderBy={[
        { key: "page", asc: true },
        { key: "id", asc: true },
      ]}
      realtime={!!prgl.db[tableName]?.subscribe}
      searchPlaceholder={({ count }) => `Search ${count} annotations...`}
      fixedControls={true}
      scrollToRow={scrollToAnnotation}
      showTopBar={{}}
      flat={true}
      bordered={false}
      onRowClick={({ id }) => onSelectAnnotation(id)}
      onRowHover={(annotation) => onHoverAnnotation(annotation?.id)}
      isRowSelected={({ id }) => id === selectedAnnotationId}
      isRowHovered={({ id }) => id === hoveredAnnotationId}
      selectedRowStyle={{
        backgroundColor: selectedAnnotationColor ?? DEFAULT_ANNOTATION_COLOR,
      }}
      hoveredRowStyle={{
        backgroundColor: hoveredAnnotationColor ?? DEFAULT_ANNOTATION_COLOR,
      }}
      className="PdfViewerAnnotations min-h-0 gap-0"
      style={{ flex: 1, margin: 0, padding: 0 }}
      noDataComponent={
        <InfoRow color="info" variant="filled" className="m-p5">
          No annotations. Select text in the PDF to create one.
        </InfoRow>
      }
    />
  );
};
