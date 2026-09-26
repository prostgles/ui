import { findAnnotationText } from "@common/annotationText";
import type { annotationsTableColumns } from "@common/managedTableSchema";
import type { ProstglesContext } from "@src/schemaConfig";
import type { TableHooks } from "prostgles-server";
import type { TableRowFromColumnDefinitions } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import type { FileTableRowWithExtraction } from "./extractFileText";
import { getAnnotationPageText, type AnnotationDocument } from "./getAnnotationPageText";

export const getAnnotationsTableHook = (
  annotationsTable: string,
  fileTable: string,
): TableHooks<AnnotationSchema, ProstglesContext> => ({
  [annotationsTable as "file_annotations"]: {
    beforeEach: [{
      commands: { insert: 1, update: 1 },
      validate: async ({ data, command, dbx, filter }) => {
        const anchorFields = ["file_id", "page", "end_page", "start_text", "end_text"];
        if (command === "update" && !anchorFields.some((key) => key in data)) return;
        const previous = command === "update" ?
          await dbx[annotationsTable as "file_annotations"].find(filter, { limit: 2 }) : [];
        if (command === "update" && !previous.length) return;
        if (previous.length > 1) {
          throw new Error("Update annotation anchors one annotation at a time");
        }
        const row = { ...previous[0], ...data };
        const { start_text, end_text, page, file_id } = row;
        const endPage = row.end_page ?? page;
        if (typeof page !== "number" || typeof endPage !== "number" || !Number.isInteger(page) || page < 1 || !Number.isInteger(endPage) || endPage < page) {
          throw new Error("Annotation pages must be positive integers with end_page >= page");
        }
        if (start_text == null && end_text == null) {
          if (endPage !== page) throw new Error("Page-spanning annotations require start_text and end_text");
          return { row: { ...data, fallback_edges: null } };
        }
        if (typeof start_text !== "string" || !start_text.trim() ||
            typeof end_text !== "string" || !end_text.trim()) {
          throw new Error("Provide non-empty start_text and end_text together");
        }
        if (typeof file_id !== "string") throw new Error("Provide an annotation file_id");
        const file = await dbx[fileTable as "files"].findOne({ id: file_id });
        if (!file) throw new Error("Annotation file was not found");
        const document = file.docling_metadata;
        const getPage = (pageNumber: number) => {
          if (document) return getAnnotationPageText(document, pageNumber);
          const text = file.text_content?.[pageNumber - 1];
          if (file.text_content && text === undefined) {
            throw new Error(`Page ${pageNumber} is missing from extracted text`);
          }
          return text === undefined ? undefined : { text, getBBox: () => undefined };
        };
        const startPage = getPage(page);
        const lastPage = endPage === page ? startPage : getPage(endPage);
        const match = (source: typeof startPage, quote: string, name: string, pageNumber: number) => {
          if (!source) return undefined;
          try {
            return findAnnotationText(source.text, quote);
          } catch (error) {
            throw new Error(`${name} on page ${pageNumber}: ${(error as Error).message}`);
          }
        };
        const start = match(startPage, start_text, "start_text", page);
        const end = match(lastPage, end_text, "end_text", endPage);
        if (page === endPage && start && end && (end.start < start.start || end.end < start.end)) {
          throw new Error("end_text must not precede start_text");
        }
        const startBBox = start && startPage?.getBBox(start);
        const endBBox = end && lastPage?.getBBox(end);
        const excerpt: string[] = [];
        if (start && end) {
          for (let p = page; p <= endPage; p++) {
            const source = getPage(p);
            if (source) excerpt.push(source.text.slice(p === page ? start.start : 0, p === endPage ? end.end : undefined));
          }
        }
        return {
          row: {
            ...data,
            text: excerpt.length ? excerpt.join("\n") : data.text ??
              (start_text === end_text ? start_text : `${start_text}\n…\n${end_text}`),
            rectangles: [],
            fallback_edges: startBBox && endBBox ? {
              start_x: startBBox.x,
              start_y: startBBox.y,
              end_x: endBBox.x + endBBox.width,
              end_y: endBBox.y + endBBox.height,
            } : command === "insert" ? data.fallback_edges ?? null : null,
          },
        };
      },
    }],
  },
});

/** Schema keys are aliases for the configured table names. */
type AnnotationSchema = {
  files: {
    columns: Omit<FileTableRowWithExtraction, "docling_metadata"> & {
      docling_metadata: AnnotationDocument | null;
    };
  };
  file_annotations: {
    columns: TableRowFromColumnDefinitions<typeof annotationsTableColumns>;
  };
};
