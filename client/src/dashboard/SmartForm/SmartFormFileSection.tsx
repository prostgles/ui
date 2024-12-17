import type {
  AnyObject,
  TableInfo,
  DBSchemaTable,
  ValidatedColumnInfo,
} from "prostgles-types";
import { isObject, isDefined } from "prostgles-types";
import React from "react";
import type { LocalMedia, Media } from "../../components/FileInput/FileInput";
import FileInput from "../../components/FileInput/FileInput";
import type { SmartFormProps, SmartFormState } from "./SmartForm";
import { usePromise } from "prostgles-client/dist/react-hooks";

type P = {
  mediaTableInfo: TableInfo | undefined;
  getThisRow: () => AnyObject;
  row: AnyObject;
  mediaTableName: string;
  setNewRow: (newRow: AnyObject) => void;
  table: DBSchemaTable;
  setData: (
    newData: Pick<ValidatedColumnInfo, "name" | "is_pkey" | "tsDataType">,
    files: (LocalMedia | Media)[],
  ) => void;
} & Pick<SmartFormProps, "defaultData" | "onSuccess" | "db"> &
  Pick<SmartFormState, "action" | "newRow">;

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
  getThisRow,
  mediaTableName,
  row,
  setData,
  setNewRow,
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
        return getThisRow()[mediaTableName] ?? [];
      }
    } else {
      return newRow?.[tableName] ?? [row as Media];
    }
  }, [
    row,
    mediaTableName,
    getThisRow,
    action.type,
    defaultData,
    isFileTable,
    newRow,
    tableName,
  ]);

  const fileManager =
    action.loading ? null : (
      <FileInput
        key={tableName}
        className={"mt-p5 f-0 " + (tableInfo.isFileTable ? " min-w-300" : "")}
        media={media}
        minSize={isFileTable ? 470 : 450}
        maxFileCount={1}
        onAdd={(files) => {
          const currMedia = [
            ...(newRow?.[mediaTableName] || []),
            ...(action.currentRow?.[mediaTableName] || []),
          ].filter(isDefined);
          setData(
            {
              name: mediaTableName,
              is_pkey: false,
              tsDataType: "any[]",
            },
            [...currMedia, ...files],
          );
        }}
        onDelete={async (media) => {
          if ("id" in media && media.id) {
            if (action.type === "update" && tableInfo.isFileTable) {
              setNewRow({ [tableName]: [] });
            } else {
              if (db[mediaTableName]?.update) {
                const res = await db[mediaTableName]?.update!(
                  { id: media.id },
                  { deleted: true },
                  onSuccess ? { returning: "*" } : {},
                );
                onSuccess?.("update", res!);
              }
            }
          } else {
            const currMedia: Media[] = newRow?.[mediaTableName] || [];
            setData(
              {
                name: mediaTableName,
                is_pkey: false,
                tsDataType: "any[]",
              },
              currMedia.filter((m) => m.name !== media.name),
            );
          }
        }}
      />
    );

  return fileManager;
};
