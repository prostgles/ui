import type { AnyObject, DBSchemaTable } from "prostgles-types";
import { isEmpty } from "prostgles-types";
import React, { useMemo } from "react";
import type { Media } from "../../components/FileInput/FileInput";
import { FileInput } from "../../components/FileInput/FileInput";
import type { SmartFormProps } from "./SmartForm";
import type { NewRow, NewRowDataHandler } from "./SmartFormNewRowDataHandler";
import type { SmartFormState } from "./useSmartForm";

type P = {
  row: AnyObject;
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
  const tableInfo = table.info;
  const { isFileTable } = table.info;
  const tableName = table.name;
  const media: Media[] | undefined = useMemo(() => {
    if (!isFileTable) throw "Must be a file table";
    if (!isEmpty(row)) return [row as Media];
    if (defaultData && !isEmpty(defaultData)) return [defaultData as Media];
    return [];

    // if (action.type === "insert") {
    //   if (defaultData && isObject(defaultData) && !newRowData) {
    //     return [defaultData as Media];
    //   } else {
    //     return row[mediaTableName] ?? [];
    //   }
    // } else {
    //   return newRowData?.[tableName]?.value ?? [row as Media];
    // }
  }, [
    row,
    isFileTable,
    defaultData,
    // mediaTableName,
    // action.type,
    // newRowData,
    // tableName,
  ]);

  if ("loading" in action && action.loading) return null;
  if (!newRowDataHandler) return null;

  return (
    <FileInput
      key={tableName}
      className={"mt-p5 f-0 " + (tableInfo.isFileTable ? " min-w-300" : "")}
      media={media}
      minSize={isFileTable ? 470 : 450}
      maxFileCount={1}
      onAdd={([file]) => {
        // const currentRow = action.type === "update" ? action.currentRow : {};
        // const currMedia = [
        //   ...(newRowData?.[mediaTableName]?.value || []),
        //   ...(currentRow?.[mediaTableName] || []),
        // ].filter(isDefined);
        // newRowDataHandler.setColumnData(mediaTableName, {
        //   type: "nested-table",
        //   value: [...currMedia, ...files],
        // });
        newRowDataHandler.setNewRow(
          !file ?
            {}
          : {
              name: { type: "column", value: file.name },
              data: { type: "column", value: file.data },
            },
        );
      }}
      onDelete={async (media) => {
        if ("id" in media && media.id) {
          if (action.type === "update" && tableInfo.isFileTable) {
            // ????
            newRowDataHandler.setNewRow({
              [tableName]: { type: "nested-table", value: [] },
            });
          } else {
            if (db[mediaTableName]?.update) {
              const res = await db[mediaTableName].update!(
                { id: media.id },
                { deleted: true },
                onSuccess ? { returning: "*" } : {},
              );
              onSuccess?.("update", res!);
            }
          }
        } else {
          const currMedia: Media[] = newRowData?.[mediaTableName]?.value || [];
          newRowDataHandler.setColumnData(mediaTableName, {
            type: "nested-table",
            value: currMedia.filter((m) => m.name !== media.name),
          });
        }
      }}
    />
  );
};
