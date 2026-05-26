import { Icon } from "@components/Icon/Icon";
import { mdiFolder, mdiFolderOpen } from "@mdi/js";
import React from "react";

export const FolderIcon = ({
  isOpen,
  className,
}: {
  isOpen: boolean;
  className?: string;
}) => (
  <Icon
    path={isOpen ? mdiFolderOpen : mdiFolder}
    color="rgb(225 130 20)"
    sizePx={18}
    className={className + " text-1"}
  />
);
