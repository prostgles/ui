import React from "react";
import { FlexCol, type DivProps } from "../Flex";
import { isDefined } from "../../utils";

export const DropZone = ({
  onChange,
}: {
  onChange: (files: File[]) => void;
}) => {
  const { isEngaged, ...divHandlers } = useDropZone(onChange);
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

export const useDropZone = (onDropped: (files: File[]) => void) => {
  const [isEngaged, setIsEngaged] = React.useState(false);

  const divHandlers: Pick<DivProps, "onDragLeave" | "onDragOver" | "onDrop"> = {
    onDragLeave: () => setIsEngaged(false),
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsEngaged(true);
    },
    onDrop: (ev) => {
      ev.preventDefault();
      onDropped(getDataTransferFiles(ev));
      setIsEngaged(false);
    },
  };

  return { isEngaged, ...divHandlers };
};

export const getDataTransferFiles = (ev: React.DragEvent<HTMLDivElement>) => {
  if (ev.dataTransfer.items as any) {
    const files = [...ev.dataTransfer.items]
      .map((item, i) => {
        if (item.kind === "file") {
          return item.getAsFile() ?? undefined;
        }
      })
      .filter(isDefined);
    return files;
  } else {
    const files = [...ev.dataTransfer.files].map((file, i) => {
      return file;
    });
    return files;
  }
};
