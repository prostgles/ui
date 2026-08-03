import { useOnErrorAlert } from "@components/AlertProvider";
import {
  PdfViewer,
  type PdfViewerProps,
} from "@components/PdfViewer/PdfViewer";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { TableHandlerClient } from "prostgles-client";
import React, { useMemo } from "react";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import type { AnnotationsTableRow } from "./managedTableUtils";
import type { MediaViewerProps } from "./MediaViewer";

type P = Omit<PdfViewerProps, "highlights" | "onCreateHighlight"> & {
  context: MediaViewerProps["context"];
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

type annotationsContext = {
  fileTable: DBSchemaTableWJoins;
  annotationsTable: DBSchemaTableWJoins;
  fileTableHandler: TableHandlerClient;
  annotationsTableHandler: TableHandlerClient<AnnotationsTableRow>;
};

export const PdfViewerWithannotations = ({
  fileTable,
  annotationsTableHandler,
  url,
  ...pdfProps
}: Omit<P, "context"> & annotationsContext) => {
  const [newDataKey, setNewDataKey] = React.useState(0);
  const fileId = url.split("/").pop()?.split(".")[0] || url;
  const { data: annotations } = annotationsTableHandler.useSubscribe(
    {
      $existsJoined: {
        [fileTable.name]: {
          id: fileId,
        },
      },
    },
    {},
    { deps: [newDataKey] },
  );

  const { onErrorAlert } = useOnErrorAlert();

  return (
    <PdfViewer
      url={url}
      highlights={
        annotations?.map(({ id, text, page, rectangles }) => ({
          id,
          page,
          color: "var(--b-warning)",
          rects: rectangles,
          tooltip: text,
        })) ?? []
      }
      onCreateHighlight={({ page, rects, text }) => {
        void onErrorAlert(async () => {
          if (!rects.length) return;

          await annotationsTableHandler.insert({
            id: undefined as any,
            name: null,
            file_id: fileId,
            text,
            page,
            rectangles: rects.map(({ x, y, height, width }) => ({
              x: Number(x.toFixed(2)),
              y: Number(y.toFixed(2)),
              width: Number(width.toFixed(2)),
              height: Number(height.toFixed(2)),
            })),
          });
          setNewDataKey((k) => k + 1);
        });
      }}
      {...pdfProps}
    />
  );
};
