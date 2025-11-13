import type { LocalMedia } from "@components/FileInput/FileInput";
import { MediaViewer } from "@components/MediaViewer";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { type DBSchemaTable } from "prostgles-types";
import React from "react";
import type { SmartFormProps } from "../SmartForm";

type P = {
  table: DBSchemaTable;
  media: string | LocalMedia | undefined | null;
} & Pick<SmartFormProps, "db">;

export const SmartFormFieldFileSection = ({ db, table, media }: P) => {
  const { fileTableName } = table.info;
  const mediaFile = usePromise(async () => {
    if (!fileTableName || !media) return undefined;
    if (typeof media === "string") {
      const mediaItem = await db[fileTableName]?.findOne?.({ id: media });
      if (!mediaItem) return;
      return {
        url: mediaItem.url,
        content_type: mediaItem.content_type,
      };
    }
    const { data } = media;
    const url = URL.createObjectURL(data);
    const content_type = data.type;
    return { url, content_type };
  }, [media, db, fileTableName]);
  if (!mediaFile) return null;
  const { url, content_type } = mediaFile;
  return (
    <MediaViewer
      style={{ maxHeight: "250px" }}
      key={url}
      url={url}
      content_type={content_type}
    />
  );
};
