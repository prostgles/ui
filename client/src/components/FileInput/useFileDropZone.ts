import React, { useMemo, useRef } from "react";
import { type DivProps } from "../Flex";
import { isDefined } from "@common/filterUtils";

export const useFileDropZone = (onDropped: (files: File[]) => void) => {
  const [isEngaged, setIsEngaged] = React.useState(false);
  const isEngagedRef = useRef(isEngaged);
  isEngagedRef.current = isEngaged;

  const divHandlers: Pick<DivProps, "onDragLeave" | "onDragOver" | "onDrop"> =
    useMemo(
      () => ({
        onDragLeave: () => setIsEngaged(false),
        onDragOver: (e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            e.stopPropagation();
            setIsEngaged(true);
          }
        },
        onDrop: (ev) => {
          if (isEngagedRef.current) {
            ev.preventDefault();
            onDropped(getDataTransferFiles(ev));
            setIsEngaged(false);
          }
        },
      }),
      [onDropped],
    );

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
