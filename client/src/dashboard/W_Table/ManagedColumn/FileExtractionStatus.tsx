import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import type { FileTableRowExtraction } from "@components/MediaViewer/managedTableUtils";
import { MonacoEditor } from "@components/MonacoEditor/MonacoEditor";
import PopupMenu from "@components/PopupMenu";
import { useStopwatch } from "@components/Stopwatch";
import { mdiCheckBold, mdiCross } from "@mdi/js";
import React from "react";
import { RenderValue } from "../../SmartForm/SmartFormField/RenderValue";

export const FileExtractionStatus = ({
  value,
}: {
  value: FileTableRowExtraction["extraction_status"];
}) => {
  if (!value) {
    return <RenderValue column={undefined} value={value} />;
  }
  const end = value.state === "loading" ? undefined : value.end;
  const title = JSON.stringify(value.options);

  const startTime = new Date(value.start);
  const endTime = end ? new Date(end) : undefined;
  const { displayTime } = useStopwatch({ startTime, endTime });

  return (
    <div title={title}>
      <PopupMenu
        title={"Extraction options"}
        button={
          <Btn
            color={
              value.state === "finished" ? "green"
              : value.state === "error" ?
                "danger"
              : "warn"
            }
            variant="faded"
            loading={value.state === "loading" && "allow-clicking"}
            iconPath={
              value.state === "finished" ? mdiCheckBold
              : value.state === "error" ?
                mdiCross
              : undefined
            }
            children={
              value.state === "finished" ? "Extracted. " + displayTime
              : value.state === "error" ?
                "Extraction failed. " + displayTime
              : "Extracting... " + displayTime
            }
          />
        }
      >
        <MonacoEditor
          language="json"
          value={JSON.stringify(value.options, null, 2)}
          loadedSuggestions={undefined}
        />
        <ErrorComponent
          error={value.state === "error" ? value.error : undefined}
        />
      </PopupMenu>
    </div>
  );
};
