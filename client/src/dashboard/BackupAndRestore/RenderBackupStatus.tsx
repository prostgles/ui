import React from "react";
import type { Backups } from "../Dashboard/dashboardUtils";
import Chip from "@components/Chip";
import { parsedError } from "@components/ErrorComponent";
import { ProgressBar } from "@components/ProgressBar";
import { bytesToSize } from "./BackupsControls";

export const RenderBackupStatus = ({
  row,
  status,
}: {
  status: Backups["status"] | undefined;
  row: Backups;
}) => {
  const commonChipStyle: React.CSSProperties = {
    padding: 0,
    background: "unset",
    border: "unset",
  };
  const total = +(
    (status?.state === "loading" ? status.total : undefined) ||
    row.sizeInBytes ||
    +row.dbSizeInBytes ||
    0
  );
  return (
    !status ? null
    : "ok" in status ?
      <Chip
        style={commonChipStyle}
        className="font-12"
        color="green"
        value={"Completed"}
      />
    : "err" in status ?
      <Chip
        style={commonChipStyle}
        color="red"
        value={parsedError(status.err)}
      />
    : status.state === "loading" ?
      <div className="text-1p5">
        <ProgressBar
          message={
            !status.loaded || status.loaded < 0 ?
              "Preparing..."
            : `Processed ${bytesToSize(status.loaded || 0)}/${total ? bytesToSize(total) : "unknown"}`
          }
          style={{
            minWidth: "150px",
          }}
          value={status.loaded || 0}
          totalValue={total || 0}
        />
      </div>
    : null
  );
};
