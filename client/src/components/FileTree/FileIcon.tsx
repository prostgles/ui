import { Icon } from "@components/Icon/Icon";
import { mdiFileDocument } from "@mdi/js";
import { CONTENT_TYPE_TO_EXT } from "prostgles-types";
import React from "react";
import { FILE_EXTENSION_TO_ICON_INFO } from "./FILE_EXTENSION_TO_ICON_INFO";

export const FileIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const iconInfo = getFileIconInfo(name);
  const { color, iconPath } = iconInfo ?? {};
  return (
    <Icon
      color={color}
      path={iconPath || mdiFileDocument}
      sizePx={20}
      className={className + " text-1"}
    />
  );
};

export const getFileIconInfo = (name: string, contentType?: string) => {
  const pathname = URL.parse(name, window.location.origin)?.pathname ?? name;
  const filename = pathname.split("/").at(-1) ?? "";
  const extension = filename
    .toLowerCase()
    .split(".")
    .slice(1) // Ignore if no dot
    .at(-1);
  const mimeType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    FILE_EXTENSION_TO_ICON_INFO[extension ?? ""] ??
    extensionsByContentType[mimeType]
      ?.map((extension) => FILE_EXTENSION_TO_ICON_INFO[extension])
      .find(Boolean)
  );
};

const extensionsByContentType: Record<string, readonly string[]> =
  CONTENT_TYPE_TO_EXT;
