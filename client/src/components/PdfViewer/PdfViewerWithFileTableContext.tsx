import Btn from "@components/Btn";
import {
  PdfViewer,
  type PdfViewerProps,
} from "@components/PdfViewer/PdfViewer";
import Popup from "@components/Popup/Popup";
import { Select } from "@components/Select/Select";
import { mdiComment, mdiSearchWeb } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { TableHandlerClient } from "prostgles-client";
import type { AnyObject } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import { SmartForm } from "src/dashboard/SmartForm/SmartForm";
import type {
  AnnotationsTableRow,
  DBManagedTableSchema,
  FilesTableRow,
} from "../MediaViewer/managedTableUtils";
import type { MediaViewerProps } from "../MediaViewer/MediaViewer";
import type { CreatedHighlight } from "./PdfViewerHighlights/PdfViewerHighlights";

type P = Omit<
  PdfViewerProps,
  "highlights" | "onCreateHighlight" | "topLeftControls"
> & {
  context: MediaViewerProps["context"];
};

type AnnotationsContext = {
  row: AnyObject;
  fileTable: DBSchemaTableWJoins;
  annotationsTable: DBSchemaTableWJoins;
  fileTableHandler: TableHandlerClient<FilesTableRow, DBManagedTableSchema>;
  annotationsTableHandler: TableHandlerClient<
    AnnotationsTableRow,
    DBManagedTableSchema
  >;
};

const PdfViewerWithannotations = ({
  fileTable,
  fileTableHandler,
  annotationsTableHandler,
  annotationsTable,
  url,
  ...pdfProps
}: Omit<P, "context" | "topLeftControls"> & AnnotationsContext) => {
  const prgl = usePrgl();
  const fileId = url.split("/").at(-1)?.split(".")[0] || url;
  const { data: fileRow } = fileTableHandler.useFindOne(
    {
      id: fileId,
    },
    {
      select: {
        id: 1,
        original_name: 1,
        original_last_modified: 1,
        text_content: 1,
        docling_metadata: 1,
      },
    },
  );
  const { data: annotations } = annotationsTableHandler.useSubscribe({
    $existsJoined: {
      [fileTable.name as "files"]: {
        id: fileId,
      },
    },
  });

  const [activeAnnotationId, setActiveAnnotationId] = useState<number>();
  const activeAnnotation = annotations?.find(
    (a) => a.id === activeAnnotationId,
  );

  const [newAnnotation, setNewAnnotation] = useState<CreatedHighlight>();

  return (
    <>
      {activeAnnotation !== undefined && (
        <SmartForm
          asPopup={true}
          {...prgl}
          tableName={annotationsTable.name}
          rowFilter={[{ fieldName: "id", value: activeAnnotationId }]}
          onClose={() => setActiveAnnotationId(undefined)}
        />
      )}
      <PdfViewer
        url={url}
        defaultPage={activeAnnotation?.page}
        doclingDocument={fileRow?.docling_metadata ?? undefined}
        topLeftControls={
          <Select
            emptyLabel={`Annotations (${annotations?.length ?? 0})`}
            btnProps={{
              iconPath: mdiSearchWeb,
              color: "action",
            }}
            fullOptions={
              annotations
                ?.toSorted((a, b) => a.page - b.page)
                .map(({ id, name, page, text }) => ({
                  key: id,
                  label: name || text,
                  subLabel: `Page ${page}: ${text}`,
                })) ?? []
            }
            onChange={(annotationId) => {
              setActiveAnnotationId(annotationId);
            }}
          />
        }
        highlights={
          annotations?.map(({ id, name, text, page, rectangles }) => ({
            id,
            page,
            color: "var(--active)",
            rects: rectangles,
            tooltip: name || text,
            leftHandle: (
              <Btn
                title="Show highlight details"
                iconPath={mdiComment}
                className="jc-center round"
                aria-label={`Show details`}
                color="action"
                style={{
                  padding: 0,
                }}
                variant="faded"
                onClick={() => setActiveAnnotationId(id)}
              />
            ),
          })) ?? []
        }
        onCreateHighlight={setNewAnnotation}
        {...pdfProps}
      />
      {newAnnotation && (
        <Popup
          title="Add annotation"
          onClose={() => setNewAnnotation(undefined)}
          contentClassName="pt-2 min-w-600"
          positioning="right-panel"
        >
          <SmartForm
            {...prgl}
            label=""
            tableName={annotationsTable.name}
            fixedData={{
              page: newAnnotation.page,
              file_id: fileId,
              rectangles: newAnnotation.rects.map(
                ({ x, y, height, width }) => ({
                  x: Number(x.toFixed(2)),
                  y: Number(y.toFixed(2)),
                  width: Number(width.toFixed(2)),
                  height: Number(height.toFixed(2)),
                }),
              ),
            }}
            defaultData={{
              name: null,
              text: newAnnotation.text,
            }}
            onClose={() => setActiveAnnotationId(undefined)}
          />
        </Popup>
      )}
    </>
  );
};

export const PdfViewerWithFileTableContext = ({ context, ...pdfProps }: P) => {
  const { db, tables } = usePrgl();
  const annotationsContext = useMemo(() => {
    if (!context) return;
    const fileTable = tables.find((t) => t.managedTableType === "files");
    const annotationsTable = tables.find(
      (t) => t.managedTableType === "file-annotations",
    );
    const fileTableHandler = fileTable && db[fileTable.name];
    const annotationsTableHandler =
      annotationsTable && db[annotationsTable.name];
    if (
      !fileTable ||
      !annotationsTable ||
      !fileTableHandler?.find ||
      !annotationsTableHandler?.find
    ) {
      return;
    }
    return {
      row: context.row,
      fileTable,
      annotationsTable,
      fileTableHandler: fileTableHandler as TableHandlerClient,
      annotationsTableHandler: annotationsTableHandler as TableHandlerClient,
    };
  }, [context, db, tables]);

  if (annotationsContext) {
    return <PdfViewerWithannotations {...pdfProps} {...annotationsContext} />;
  }
  return <PdfViewer {...pdfProps} />;
};
