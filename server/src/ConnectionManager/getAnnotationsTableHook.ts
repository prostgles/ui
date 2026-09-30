import {
  findAnnotationText,
  type AnnotationTextSelection,
} from "@common/annotationText";
import type { annotationsTableColumns } from "@common/managedTableSchema";
import type { ProstglesContext } from "@src/schemaConfig";
import type { TableHooks } from "prostgles-server";
import type { TableRowFromColumnDefinitions } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import type { FileTableRowWithExtraction } from "./extractFileText";
import {
  getAnnotationPageText,
  type AnnotationDocument,
} from "./getAnnotationPageText";

export const getAnnotationsTableHook = (
  annotationsTable: string,
  fileTable: string,
): TableHooks<AnnotationSchema, ProstglesContext> => ({
  [annotationsTable as "file_annotations"]: {
    beforeEach: [
      {
        commands: { insert: 1, update: 1 },
        validate: async ({ data, command, dbx, filter }) => {
          const anchorFields = [
            "file_id",
            "page",
            "end_page",
            "start_text",
            "end_text",
            "text_selections",
          ];
          if (command === "update" && !anchorFields.some((key) => key in data))
            return;
          const previous =
            command === "update" ?
              await dbx[annotationsTable as "file_annotations"].find(filter, {
                limit: 2,
              })
            : [];
          if (command === "update" && !previous.length) return;
          if (previous.length > 1)
            throw new Error(
              "Update annotation anchors one annotation at a time",
            );
          const row = { ...previous[0], ...data };
          if (typeof row.file_id !== "string")
            throw new Error("Provide an annotation file_id");
          const file = await dbx[fileTable as "files"].findOne({
            id: row.file_id,
          });
          if (!file) throw new Error("Annotation file was not found");
          const getPage = (page: number) => {
            if (!Number.isInteger(page) || page < 1)
              throw new Error("Annotation pages must be positive integers");
            if (file.docling_metadata)
              return getAnnotationPageText(file.docling_metadata, page);
            const text = file.text_content?.[page - 1];
            if (file.text_content && text === undefined)
              throw new Error(`Page ${page} is missing from extracted text`);
            return text === undefined ? undefined : (
                { text, getSelections: undefined }
              );
          };
          const resolve = (
            page: number,
            startText: string,
            endText: string,
          ): AnnotationTextSelection[] => {
            if (!startText.trim() || !endText.trim())
              throw new Error("Provide non-empty startText and endText");
            const source = getPage(page);
            if (!source) return [{ page, startText, endText }];
            try {
              const start = findAnnotationText(source.text, startText);
              const end = findAnnotationText(source.text, endText);
              if (end.start < start.start || end.end < start.end)
                throw new Error("endText must not precede startText");
              const range = { start: start.start, end: end.end };
              const text = source.text.slice(range.start, range.end);
              return (
                source.getSelections?.(range) ?? [
                  { page, startText: text, endText: text },
                ]
              );
            } catch (error) {
              throw new Error(
                `Annotation on page ${page}: ${(error as Error).message}`,
              );
            }
          };
          let selections: AnnotationTextSelection[];
          // Explicit selections win; changing shorthand anchors rebuilds their selections.
          const explicit =
            data.text_selections ??
            ((
              Object.keys(data).every(
                (key) =>
                  !["page", "end_page", "start_text", "end_text"].includes(key),
              )
            ) ?
              row.text_selections
            : undefined);
          if (explicit) {
            if (!explicit.length)
              throw new Error("Provide at least one text selection");
            selections = explicit.flatMap((selection) => {
              const { page, startText, endText, rects } = selection;
              if (
                !Number.isInteger(page) ||
                page < 1 ||
                !startText.trim() ||
                !endText.trim()
              )
                throw new Error(
                  "Provide a positive page and non-empty startText and endText",
                );
              if (!rects?.length) return resolve(page, startText, endText);
              if (
                rects.some(
                  (r) =>
                    ![r.x, r.y, r.width, r.height].every(Number.isFinite) ||
                    r.x < 0 ||
                    r.y < 0 ||
                    r.width <= 0 ||
                    r.height <= 0,
                )
              )
                throw new Error("Invalid selection rectangles");
              return [selection];
            });
          } else {
            const { page, start_text, end_text } = row;
            const endPage = row.end_page ?? page;
            if (
              typeof page !== "number" ||
              typeof endPage !== "number" ||
              !Number.isInteger(page) ||
              !Number.isInteger(endPage) ||
              page < 1 ||
              endPage < page
            )
              throw new Error(
                "Annotation pages must be positive integers with end_page >= page",
              );
            if (
              typeof start_text !== "string" ||
              typeof end_text !== "string" ||
              !start_text.trim() ||
              !end_text.trim()
            )
              throw new Error("Provide non-empty start_text and end_text");
            selections = [];
            for (let p = page; p <= endPage; p++) {
              if (page === endPage) {
                selections.push(...resolve(p, start_text, end_text));
                continue;
              }
              const source = getPage(p);
              if (!source)
                throw new Error(
                  "Page-spanning anchors require extracted text; provide text_selections instead",
                );
              const start =
                p === page ?
                  findAnnotationText(source.text, start_text).start
                : 0;
              const end =
                p === endPage ?
                  findAnnotationText(source.text, end_text).end
                : source.text.length;
              const text = source.text.slice(start, end);
              if (text.trim())
                selections.push(
                  ...(source.getSelections?.({ start, end }) ?? [
                    { page: p, startText: text, endText: text },
                  ]),
                );
            }
          }
          if (!selections.length)
            throw new Error("Annotation contains no selected text");
          selections.sort((a, b) => a.page - b.page);
          return {
            row: {
              ...data,
              page: selections[0]!.page,
              end_page: selections.at(-1)!.page,
              text_selections: selections,
              text: selections
                .map((s) =>
                  s.startText === s.endText ?
                    s.startText
                  : `${s.startText}\n…\n${s.endText}`,
                )
                .join("\n"),
            },
          };
        },
      },
    ],
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
