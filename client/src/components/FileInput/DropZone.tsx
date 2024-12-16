import React from "react";
import { FlexCol } from "../Flex";
import { isDefined } from "../../utils";

export const DropZone = ({
  onChange,
}: {
  onChange: (files: File[]) => void;
}) => {
  const [isEngaged, setIsEngaged] = React.useState(false);
  return (
    <FlexCol
      className={
        "DropZone b b-active rounded w-full flex-col jc-center ai-center f-1" +
        (isEngaged ? " active-shadow " : "")
      }
      style={{ minHeight: "30vh" }}
      onDragLeave={() => setIsEngaged(false)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEngaged(true);
      }}
      onDrop={(ev) => {
        ev.preventDefault();
        onChange(getDataTransferFiles(ev));
      }}
    >
      <div className="noselect text-1">Drop files here...</div>
    </FlexCol>
  );
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
