import { useOnErrorAlert } from "@components/AlertProvider";
import {
  PdfViewer,
  type PdfViewerProps,
} from "@components/PdfViewer/PdfViewer";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { TableHandlerClient } from "prostgles-client";
import React, { useMemo } from "react";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import type { CitationsTableRow } from "./managedTableUtils";
import type { MediaViewerProps } from "./MediaViewer";

type P = Omit<PdfViewerProps, "highlights" | "onCreateHighlight"> & {
  context: MediaViewerProps["context"];
};

export const PdfViewerWithFileTableContext = ({ context, ...pdfProps }: P) => {
  const { db, tables } = usePrgl();
  const citationsContext = useMemo(() => {
    if (!context) return;
    const fileTable = tables.find((t) => t.managedTableType === "files");
    const citationsTable = tables.find(
      (t) => t.managedTableType === "file-citations",
    );
    const fileTableHandler = fileTable && db[fileTable.name];
    const citationsTableHandler = citationsTable && db[citationsTable.name];
    if (
      !fileTable ||
      !citationsTable ||
      !fileTableHandler?.find ||
      !citationsTableHandler?.find
    ) {
      return;
    }
    return {
      fileTable,
      citationsTable,
      fileTableHandler: fileTableHandler as TableHandlerClient,
      citationsTableHandler: citationsTableHandler as TableHandlerClient,
    };
  }, [context, db, tables]);

  if (citationsContext) {
    return <PdfViewerWithCitations {...pdfProps} {...citationsContext} />;
  }
  return <PdfViewer {...pdfProps} />;
};

type CitationsContext = {
  fileTable: DBSchemaTableWJoins;
  citationsTable: DBSchemaTableWJoins;
  fileTableHandler: TableHandlerClient;
  citationsTableHandler: TableHandlerClient<CitationsTableRow>;
};

export const PdfViewerWithCitations = ({
  fileTable,
  citationsTableHandler,
  url,
  ...pdfProps
}: Omit<P, "context"> & CitationsContext) => {
  const [newDataKey, setNewDataKey] = React.useState(0);
  const { data: citations } = citationsTableHandler.useFind(
    {
      $existsJoined: {
        [fileTable.name]: {
          url,
        },
      },
    },
    {},
    { deps: [newDataKey] },
  );

  const { onErrorAlert } = useOnErrorAlert();
  const fileId = url.split("/").pop()?.split(".")[0] || url;

  return (
    <PdfViewer
      url={url}
      highlights={
        citations?.map(({ id, text, page, rectangles }) => ({
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

          await citationsTableHandler.insert({
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
