import { isObject } from "prostgles-types";
import type { AnnotationsTableRow } from "@components/MediaViewer/managedTableUtils";

export type FileAnnotationPreview = Pick<
  AnnotationsTableRow,
  "id" | "text" | "page" | "file_id" | "file_version"
>;

export const FILE_ANNOTATION_SELECT = {
  id: 1,
  text: 1,
  page: 1,
  file_id: 1,
  file_version: 1,
} as const satisfies Record<keyof FileAnnotationPreview, 1>;

export const isFileAnnotationPreview = (
  value: unknown,
): value is FileAnnotationPreview =>
  isObject(value) &&
  typeof value.id === "number" &&
  typeof value.text === "string" &&
  typeof value.page === "number" &&
  typeof value.file_id === "string" &&
  (value.file_version === null || typeof value.file_version === "number");
