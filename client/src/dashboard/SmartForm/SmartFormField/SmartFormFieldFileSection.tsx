import type { LocalMedia } from "@components/FileInput/FileInput";
import { MediaViewer } from "@components/MediaViewer/MediaViewer";
import { usePromise } from "prostgles-client";
import { type DBSchemaTable } from "prostgles-types";
import React from "react";
import type { SmartFormProps } from "../SmartForm";

type P = {
  table: DBSchemaTable;
  media: string | LocalMedia | undefined | null;
} & Pick<SmartFormProps, "db">;

export const SmartFormFieldFileSection = ({
  db,
  table,
  media: localMediaOrMediaId,
}: P) => {
  const { fileTableName } = table;
  const mediaFile = usePromise(async () => {
    if (!fileTableName || !localMediaOrMediaId) return undefined;
    if (typeof localMediaOrMediaId === "string") {
      const mediaItem = await db[fileTableName]?.findOne?.({
        id: localMediaOrMediaId,
      });
      if (!mediaItem) return;
      return {
        url: mediaItem.url,
        content_type: mediaItem.content_type,
      };
    }
    const { data } = localMediaOrMediaId;
    const url = URL.createObjectURL(data);
    const content_type = data.type;

    return { url, content_type };
  }, [localMediaOrMediaId, db, fileTableName]);

  if (!mediaFile) return null;

  const { url, content_type } = mediaFile;

  return (
    <MediaViewer
      style={{ maxHeight: "250px", flex: "none" }}
      key={url}
      url={url}
      name="Click to preview"
      content_type={content_type}
    />
  );
};
