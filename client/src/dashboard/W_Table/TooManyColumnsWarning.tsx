import { mdiAlertOutline } from "@mdi/js";
import React, { useEffect, useMemo } from "react";
import Btn from "../../components/Btn";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";

type P = {
  w: WindowSyncItem<"table"> | WindowSyncItem<"sql">;
  onHide: VoidFunction;
  numberOfCols: number;
  numberOfRows: number;
};
export const TooManyColumnsWarning = ({
  w,
  onHide,
  numberOfCols,
  numberOfRows,
}: P) => {
  const cells = numberOfCols * numberOfRows;
  const [show, setShow] = React.useState(false);
  useEffect(() => {
    const tooManyCells = cells > 500;
  }, [cells]);

  if (!show) return null;

  return (
    <PopupMenu
      button={
        <Btn
          iconPath={mdiAlertOutline}
          color="warn"
          variant="outline"
          className="shadow"
          style={{
            position: "absolute",
            bottom: "1em",
            left: "1em",
            zIndex: 1,
          }}
        />
      }
      footerButtons={[
        { label: "Cancel", onClickClose: true },
        {
          label: "Hide this warning",
          onClick: onHide,
        },
        {
          label: "Show only first 15 columns",
          color: "action",
          variant: "faded",
          onClick: () => {
            w.$update({
              columns: w.columns?.map((c, i) => ({
                ...c,
                show: i <= 15,
              })),
            });
          },
        },
      ]}
    >
      <InfoRow variant="naked" color="warning">
        There is a high number ({w.columns?.filter((c) => c.show)?.length}) of
        rows/columns displayed. Reduce the number of viewed rows/columns from
        the table menu to improve performance
      </InfoRow>
    </PopupMenu>
  );
};
