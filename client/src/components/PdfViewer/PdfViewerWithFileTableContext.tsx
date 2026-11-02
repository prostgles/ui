import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import {
  PdfViewer,
  type PdfViewerProps,
} from "@components/PdfViewer/PdfViewer";
import Popup from "@components/Popup/Popup";
import { Select } from "@components/Select/Select";
import { mdiComment, mdiSearchWeb } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { TableHandlerClient } from "prostgles-client";
import React, { useMemo, useState } from "react";
import type { DBSchemaTableWJoins } from "src/dashboard/Dashboard/dashboardUtils";
import { SmartForm } from "src/dashboard/SmartForm/SmartForm";
import type { DBManagedTableSchema } from "../MediaViewer/managedTableUtils";
import type { MediaViewerProps } from "../MediaViewer/MediaViewer";
import type { CreatedHighlight } from "./PdfViewerHighlights/PdfViewerHighlights";

type P = Omit<
  PdfViewerProps,
  "highlights" | "onCreateHighlight" | "topLeftControls"
> & {
  context: MediaViewerProps["context"];
  fileId: string | undefined;
};

type AnnotationsContext = {
  fileId: string;
  annotationPage: number | undefined;
  fileTable: DBSchemaTableWJoins;
  annotationsTable: DBSchemaTableWJoins;
  fileTableHandler: TableHandlerClient<DBManagedTableSchema, "files">;
  fileVersionsTableHandler:
    TableHandlerClient<DBManagedTableSchema, "files_versions"> | undefined;
  requestedFileVersion: number | null | undefined;
  annotationsTableHandler: TableHandlerClient<
    DBManagedTableSchema,
    "file_annotations"
  >;
};

const PdfViewerWithAnnotations = ({
  fileId,
  fileTableHandler,
  fileVersionsTableHandler,
  fileVersion,
  annotationsTableHandler,
  annotationsTable,
  url,
  annotationPage,
  ...pdfProps
}: Omit<P, "context" | "topLeftControls"> &
  AnnotationsContext & {
    fileVersion: number | null;
  }) => {
  const prgl = usePrgl();
  const sourceTableHandler = fileVersionsTableHandler ?? fileTableHandler;
  const { data: fileRow } = sourceTableHandler.useFindOne(
    fileVersion ? { file_id: fileId, version: fileVersion } : { id: fileId },
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
    file_id: fileId,
    file_version: fileVersion,
  });

  const [activeAnnotationId, setActiveAnnotationId] = useState<number>();
  const activeAnnotation = annotations?.find(
    (a) => a.id === activeAnnotationId,
  );

  const [newAnnotation, setNewAnnotation] = useState<CreatedHighlight>();
  const revisionUrl = new URL(url, window.location.href);
  if (fileVersion) {
    revisionUrl.searchParams.set("version", String(fileVersion));
  }

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
        {...pdfProps}
        url={revisionUrl.href}
        defaultPage={annotationPage ?? pdfProps.defaultPage}
        activeHighlightId={activeAnnotationId}
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
                .map(({ id, name, page, end_page, text }) => ({
                  key: id,
                  label: name || text,
                  subLabel: `Page ${page}${end_page && end_page !== page ? `–${end_page}` : ""}: ${text}`,
                })) ?? []
            }
            onChange={(annotationId) => {
              setActiveAnnotationId(annotationId);
            }}
          />
        }
        highlights={
          annotations?.map(({ id, name, text, page, text_selections }) => ({
            id,
            page,
            text_selections,
            color: "var(--active)",
            rects: [],
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
        onCreateHighlight={fileRow ? setNewAnnotation : undefined}
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
              text_selections: newAnnotation.text_selections,
              file_id: fileId,
              file_version: fileVersion,
            }}
            defaultData={{
              name: null,
              text: newAnnotation.text,
            }}
            onClose={() => setNewAnnotation(undefined)}
            onInserted={() => setNewAnnotation(undefined)}
          />
        </Popup>
      )}
    </>
  );
};

const PdfViewerWithResolvedVersion = (
  props: Omit<P, "context"> & AnnotationsContext,
) => {
  const {
    fileTable,
    fileTableHandler,
    fileVersionsTableHandler,
    requestedFileVersion,
  } = props;
  const hasVersioning = fileTable.columns.some(
    ({ name }) => name === "version",
  );
  const { data: currentFile } = fileTableHandler.useFindOne(
    { id: props.fileId },
    { select: hasVersioning ? { version: 1 } : { id: 1 } },
  );
  if (!currentFile) return null;
  const fileVersion = (
    requestedFileVersion === undefined ?
      (currentFile.version ?? null)
    : requestedFileVersion) as number | null;
  if (hasVersioning && (!fileVersion || !fileVersionsTableHandler)) {
    return (
      <ErrorComponent error="The annotation's file revision is missing or unavailable." />
    );
  }
  return (
    <PdfViewerWithAnnotations
      key={`${props.fileId}:${fileVersion}`}
      {...props}
      fileVersion={fileVersion}
    />
  );
};

export const PdfViewerWithFileTableContext = ({
  context,
  fileId,
  ...pdfProps
}: P) => {
  const { db, tables } = usePrgl();
  const annotationsContext = useMemo(() => {
    if (!context || !fileId) return;
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
    const fileVersionsTable = annotationsTable.columns
      .find(({ name }) => name === "file_version")
      ?.references?.find(({ fcols }) => fcols.includes("version"))?.ftable;
    const urlVersion = new URL(
      pdfProps.url,
      window.location.href,
    ).searchParams.get("version");
    const requestedFileVersion =
      context.table.managedTableType === "file-annotations" ?
        typeof context.row.file_version === "number" ?
          context.row.file_version
        : null
      : urlVersion ? Number(urlVersion)
      : undefined;
    return {
      fileId,
      requestedFileVersion,
      fileVersionsTableHandler:
        fileVersionsTable ?
          (db[fileVersionsTable] as TableHandlerClient<
            DBManagedTableSchema,
            "files_versions"
          >)
        : undefined,
      annotationPage:
        (
          context.table.managedTableType === "file-annotations" &&
          typeof context.row.page === "number"
        ) ?
          context.row.page
        : undefined,
      fileTable,
      annotationsTable,
      fileTableHandler: fileTableHandler as TableHandlerClient,
      annotationsTableHandler: annotationsTableHandler as TableHandlerClient,
    };
  }, [context, fileId, db, tables, pdfProps.url]);

  if (annotationsContext) {
    return (
      <PdfViewerWithResolvedVersion {...pdfProps} {...annotationsContext} />
    );
  }
  return <PdfViewer {...pdfProps} />;
};
