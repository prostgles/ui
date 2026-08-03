import type { LocalMedia, Media } from "@components/FileInput/FileInput";
import { FileInput } from "@components/FileInput/FileInput";
import type { FilesTableRow } from "@components/MediaViewer/managedTableUtils";
import type { DBSchemaTable } from "prostgles-types";
import { isEmpty } from "prostgles-types";
import React, { useMemo } from "react";
import type { SmartFormProps } from "./SmartForm";
import type { NewRow, NewRowDataHandler } from "./SmartFormNewRowDataHandler";
import type { SmartFormState } from "./useSmartForm";

type P = {
  row: Media | Record<string, never> | undefined;
  mediaTableName: string;
  newRowDataHandler: NewRowDataHandler | undefined;
  table: DBSchemaTable;
  newRowData: NewRow | undefined;
} & Pick<SmartFormProps, "defaultData" | "onSuccess" | "db"> &
  Pick<SmartFormState, "mode">;

/**
 * Appears at the bottom of the form when the table is a file table.
 */
export const SmartFormFileSection = ({
  db,
  table,
  newRowData,
  defaultData,
  mode: action,
  onSuccess,
  mediaTableName,
  row,
  newRowDataHandler,
}: P) => {
  const { isFileTable } = table;
  const tableName = table.name;
  const media: Media[] | undefined = useMemo(() => {
    if (!isFileTable) {
      throw "Must be a file table";
    }
    if (!isEmpty(row) && row?.original_name !== undefined) {
      return [row as Media];
    }
    if (defaultData && !isEmpty(defaultData)) return [defaultData as Media];
    return [];
  }, [row, isFileTable, defaultData]);

  if ("loading" in action && action.loading) return null;
  if (!newRowDataHandler) return null;

  return (
    <>
      <FileInput
        key={tableName}
        className={"mt-p5 f-0 " + (isFileTable ? " min-w-300" : "")}
        media={media}
        // minSize={isFileTable ? 470 : 450}
        maxFileCount={1}
        onAdd={([file]) => {
          const newFileRow =
            file &&
            ({
              original_name: { type: "column", value: file.original_name },
              original_last_modified: {
                type: "column",
                value: file.original_last_modified,
              },
              data: { type: "column", value: file.data },
            } satisfies NewRow);
          newFileRow satisfies
            | undefined
            | {
                [K in keyof Required<LocalMedia>]: {
                  type: "column";
                  value: LocalMedia[K];
                };
              };
          newRowDataHandler.setNewRow(newFileRow ?? {});
        }}
        onDelete={async (media) => {
          if ("id" in media && media.id) {
            if (action.type === "update" && isFileTable) {
              // ????
              newRowDataHandler.setNewRow({
                [tableName]: { type: "nested-table", value: [] },
              });
            } else {
              const mediaTableHandler = db[mediaTableName];
              if (mediaTableHandler?.update) {
                const res = await mediaTableHandler.update(
                  { id: media.id },
                  { deleted: true },
                  onSuccess ? { returning: "*" } : {},
                );
                onSuccess?.("update", res);
              }
            }
          } else {
            const currMedia = (newRowData?.[mediaTableName]?.value ||
              []) as Media[];
            await newRowDataHandler.setColumnData(mediaTableName, {
              type: "nested-table",
              value: currMedia.filter(
                (m) => m.original_name !== media.original_name,
              ),
            });
          }
        }}
      />
    </>
  );
};
