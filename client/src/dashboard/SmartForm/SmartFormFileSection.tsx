import Btn from "@components/Btn";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import { mdiClose } from "@mdi/js";
import type { LocalMedia, Media } from "@components/FileInput/FileInput";
import { FileInput } from "@components/FileInput/FileInput";
import type { DBSchemaTable } from "prostgles-types";
import { isEmpty } from "prostgles-types";
import React, { useMemo, useState } from "react";
import type { SmartFormProps } from "./SmartForm";
import type { NewRow, NewRowDataHandler } from "./SmartFormNewRowDataHandler";
import type { SmartFormState } from "./useSmartForm";

type P = {
  row: Media | Record<string, never> | undefined;
  newRowDataHandler: NewRowDataHandler | undefined;
  table: DBSchemaTable;
  newRowData: NewRow | undefined;
} & Pick<SmartFormProps, "defaultData"> &
  Pick<SmartFormState, "mode">;

/**
 * Appears at the bottom of the form when the table is a file table.
 */
export const SmartFormFileSection = ({
  table,
  newRowData,
  defaultData,
  mode: action,
  row,
  newRowDataHandler,
}: P) => {
  const [removed, setRemoved] = useState(false);
  const { isFileTable } = table;
  const tableName = table.name;
  const media: Media[] | undefined = useMemo(() => {
    if (!isFileTable) {
      throw "Must be a file table";
    }
    const data = newRowData?.data?.value;
    if (data instanceof File) {
      return [
        {
          data,
          original_name: newRowData?.original_name?.value,
          original_last_modified: newRowData?.original_last_modified?.value,
        },
      ];
    }
    if (removed) return [];
    if (!isEmpty(row) && row?.original_name !== undefined) {
      return [row as Media];
    }
    if (defaultData && !isEmpty(defaultData)) return [defaultData as Media];
    return [];
  }, [row, isFileTable, defaultData, newRowData, removed]);

  if ("loading" in action && action.loading) return null;
  if (!newRowDataHandler) return null;

  const onRemove = () => {
    setRemoved(true);
    const pendingRow = newRowDataHandler.getNewRow();
    delete pendingRow.data;
    delete pendingRow.original_name;
    delete pendingRow.original_last_modified;
    newRowDataHandler.setNewRow(pendingRow);
  };
  const savedMedia = media[0];
  if (savedMedia && "url" in savedMedia) {
    return (
      <>
        <MediaViewer
          url={savedMedia.url}
          style={{ width: "100%", height: "auto", flex: "none" }}
        />
        <Btn iconPath={mdiClose} onClick={onRemove} variant="faded">
          Remove file
        </Btn>
      </>
    );
  }

  return (
    <>
      <FileInput
        key={tableName}
        className={"mt-p5 f-0 " + (isFileTable ? " min-w-300" : "")}
        media={media}
        // minSize={isFileTable ? 470 : 450}
        maxFileCount={1}
        onAdd={([file]) => {
          if (!file) return;
          const newFileRow: {
            [K in keyof Required<LocalMedia>]: {
              type: "column";
              value: LocalMedia[K];
            };
          } = {
            original_name: { type: "column", value: file.original_name },
            original_last_modified: {
              type: "column",
              value: file.original_last_modified,
            },
            data: { type: "column", value: file.data },
          };
          newRowDataHandler.setNewRow({
            ...newRowDataHandler.getNewRow(),
            ...newFileRow,
          });
        }}
        onDelete={onRemove}
      />
    </>
  );
};
