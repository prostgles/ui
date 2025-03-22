import { usePromise } from "prostgles-client/dist/react-hooks";
import type { AnyObject, DBSchemaTable } from "prostgles-types";
import { isDefined, isObject } from "prostgles-types";
import React from "react";
import type { Media } from "../../components/FileInput/FileInput";
import FileInput from "../../components/FileInput/FileInput";
import type { SmartFormProps, SmartFormState } from "./SmartForm";
import type { NewRow, NewRowDataHandler } from "./SmartFormNewRowDataHandler";

type P = {
  row: AnyObject;
  mediaTableName: string;
  newRowDataHandler: NewRowDataHandler | undefined;
  table: DBSchemaTable;
  newRow: NewRow | undefined;
} & Pick<SmartFormProps, "defaultData" | "onSuccess" | "db"> &
  Pick<SmartFormState, "action">;

/**
 * Appears at the bottom of the form when the table is a file table.
 */
export const SmartFormFileSection = ({
  db,
  table,
  newRow,
  defaultData,
  action,
  onSuccess,
  mediaTableName,
  row,
  newRowDataHandler,
}: P) => {
  const tableInfo = table.info;
  const { isFileTable } = table.info;
  const tableName = table.name;
  const media: Media[] | undefined = usePromise(async () => {
    if (!isFileTable) throw "Must be a file table";
    if (action.type === "insert") {
      if (defaultData && isObject(defaultData) && !newRow) {
        return [defaultData as Media];
      } else {
        return row[mediaTableName] ?? [];
      }
    } else {
      return newRow?.[tableName]?.value ?? [row as Media];
    }
  }, [
    row,
    mediaTableName,
    action.type,
    defaultData,
    isFileTable,
    newRow,
    tableName,
  ]);

  const fileManager =
    action.loading || !newRowDataHandler ?
      null
    : <FileInput
        key={tableName}
        className={"mt-p5 f-0 " + (tableInfo.isFileTable ? " min-w-300" : "")}
        media={media}
        minSize={isFileTable ? 470 : 450}
        maxFileCount={1}
        onAdd={(files) => {
          const currMedia = [
            ...(newRow?.[mediaTableName]?.value || []),
            ...(action.currentRow?.[mediaTableName] || []),
          ].filter(isDefined);
          newRowDataHandler.setColumnData(mediaTableName, {
            type: "nested-table",
            value: [...currMedia, ...files],
          });
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
            const currMedia: Media[] = newRow?.[mediaTableName]?.value || [];
            newRowDataHandler.setColumnData(mediaTableName, {
              type: "nested-table",
              value: currMedia.filter((m) => m.name !== media.name),
            });
          }
        }}
      />;

  return fileManager;
};
