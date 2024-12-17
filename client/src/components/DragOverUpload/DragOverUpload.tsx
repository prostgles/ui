import React, { useEffect, useState } from "react";
import { FlexCol } from "../Flex";
import "./DragOverUpload.css";

type P = {
  onOpen: (files: FileList | undefined) => void;
};
export const DragOverUpload = ({ onOpen }: P) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onDrag = (ev: DragEvent) => {
      setShow(true);
    };

    const onDrop = (ev: DragEvent) => {
      onOpen(ev.dataTransfer?.files);
    };
    const onDragEnd = () => {
      setShow(false);
    };
    window.addEventListener("dragover", onDrag);
    // window.addEventListener("drag", onDrag);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragleave", onDragEnd);

    return () => {
      window.removeEventListener("dragover", onDrag);
      // window.removeEventListener("drag", onDrag);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragleave", onDragEnd);
    };
  }, [setShow, onOpen]);

  return (
    <FlexCol
      className="DragOverUpload absolute inset-0 bg-action p-2"
      style={{ zIndex: 1e3 }}
    >
      <FlexCol
        className="DragOverUpload_Border rotating-border rounded h-full w-full"
        style={{ borderStyle: "dashed" }}
      ></FlexCol>
    </FlexCol>
  );
};
