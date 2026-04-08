import { Icon } from "@components/Icon/Icon";
import { mdiFileDocument } from "@mdi/js";
import React from "react";
import { FILE_EXTENSION_TO_ICON_INFO } from "./FILE_EXTENSION_TO_ICON_INFO";

export const FileIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const extension = name.toLowerCase().split(".").at(-1) ?? "";
  const { iconPath, color } = FILE_EXTENSION_TO_ICON_INFO[extension] ?? {};
  return (
    <Icon
      color={color}
      path={iconPath || mdiFileDocument}
      sizePx={20}
      className={className + " text-1"}
    />
  );
};
