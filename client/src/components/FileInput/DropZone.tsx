import React from "react";
import { FlexCol } from "../Flex";
import { useFileDropZone } from "./useFileDropZone";

export const DropZone = ({
  onChange,
}: {
  onChange: (files: File[]) => void;
}) => {
  const { isEngaged, ...divHandlers } = useFileDropZone(onChange);
  return (
    <FlexCol
      {...divHandlers}
      className={
        "DropZone b b-active rounded w-full flex-col jc-center ai-center f-1" +
        (isEngaged ? " active-shadow " : "")
      }
      style={{ minHeight: "30vh" }}
    >
      <div className="noselect text-1">Drop files here...</div>
    </FlexCol>
  );
};
