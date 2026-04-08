import Btn from "@components/Btn";
import {
  mdiCheckboxBlankOutline,
  mdiCheckboxMarked,
  mdiRadioboxBlank,
  mdiRadioboxMarked,
} from "@mdi/js";
import React from "react";
import type { FileNode } from "./useFileTree";
import type { useFileTreeChecked } from "./useFileTreeChecked";

export const FileTreeNodeCheckbox = ({
  node,
  checkState,
}: {
  checkState: ReturnType<typeof useFileTreeChecked>;
  node: FileNode;
}) => {
  return (
    checkState &&
    (checkState.type === "all" ||
      checkState.type === node.type ||
      checkState.isChecked) && (
      <Btn
        data-command="FileTreeNode.checkbox"
        iconPath={
          checkState.mode === "pick-one" ?
            checkState.isChecked ?
              mdiRadioboxMarked
            : mdiRadioboxBlank
          : checkState.isChecked ?
            mdiCheckboxMarked
          : mdiCheckboxBlankOutline
        }
        style={{
          padding: 0,
          opacity: checkState.isChecked?.type === "inherited" ? 0.7 : 1,
        }}
        color={checkState.isChecked ? "action" : undefined}
        size="micro"
        className={checkState.isChecked ? "" : "show-on-parent-hover"}
        onClick={checkState.onCheckItem}
      />
    )
  );
};
