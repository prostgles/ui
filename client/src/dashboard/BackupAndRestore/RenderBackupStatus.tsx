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
    (status as any)?.loading?.total ||
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
    : status.loading ?
      <div className="text-1p5">
        <ProgressBar
          message={
            !status.loading.loaded || status.loading.loaded < 0 ?
              "Preparing..."
            : `Processed ${bytesToSize(status.loading.loaded || 0)}/${total ? bytesToSize(total) : "unknown"}`
          }
          style={{
            minWidth: "150px",
          }}
          value={status.loading.loaded || 0}
          totalValue={total || 0}
        />
      </div>
    : null
  );
};
