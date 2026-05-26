import Btn from "@components/Btn";
import { Expander } from "@components/Expander";
import { FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiClose } from "@mdi/js";
import React from "react";
import { FileIcon } from "./FileIcon";
import { findNode } from "./fileSystemTreeUtils";
import type { FileTreeProps } from "./FileTree";
import { FolderIcon } from "./FolderIcon";
import { type FileTreeState } from "./useFileTree";
import { isDefined } from "prostgles-types";

export const FileTreeSelectedItems = ({
  tree,
  ...props
}: Pick<FileTreeState, "tree"> & FileTreeProps) => {
  const pickerProps = props.mode === "explorer" ? undefined : props;
  if (!pickerProps) return null;
  const checkedItems =
    pickerProps.mode === "pick-one" ?
      [pickerProps.value].filter(isDefined)
    : (pickerProps.value ?? []);
  return (
    <>
      <div className="bt b-color mt-1 w-full mx-p5"></div>
      <Expander
        getButton={(isOpen) => (
          <Btn
            className="ml-1"
            iconStyle={{
              transform: `rotate(${isOpen ? "0deg" : "90deg"})`,
              transition: "transform 0.2s",
            }}
          >
            {checkedItems.length} items selected{" "}
          </Btn>
        )}
      >
        <ScrollFade
          className="o-auto p-p5 pl-1 ta-start w-fit "
          style={{ maxHeight: 100 }}
        >
          {checkedItems.map((path) => {
            const node = findNode(tree, path);
            return (
              <FlexRow key={path}>
                {node?.type === "directory" ?
                  <FolderIcon isOpen={false} />
                : <FileIcon name={path} />}
                <div className="f-1">{path}</div>
                <Btn
                  variant="icon"
                  size="micro"
                  iconPath={mdiClose}
                  onClick={() => {
                    if (pickerProps.mode === "pick-one") {
                      pickerProps.onChange(undefined);
                      return;
                    }
                    pickerProps.onChange(
                      checkedItems.filter((p) => p !== path),
                    );
                  }}
                />
              </FlexRow>
            );
          })}
        </ScrollFade>
      </Expander>
    </>
  );
};
