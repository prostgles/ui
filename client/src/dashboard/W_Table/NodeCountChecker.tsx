import React, { useEffect, useState } from "react";
import PopupMenu from "../../components/PopupMenu";
import Btn from "../../components/Btn";
import { mdiAlertOutline } from "@mdi/js";
import { InfoRow } from "../../components/InfoRow";

export const NodeCountChecker = ({
  parentNode,
  dataAge,
}: {
  parentNode: HTMLElement | undefined;
  dataAge: number | undefined;
}) => {
  const [nodeCount, setNodeCount] = useState({
    count: 0,
    tooHigh: false,
    checked: Date.now(),
  });
  useEffect(() => {
    const count = parentNode?.querySelectorAll("*").length ?? 0;
    setNodeCount({
      count,
      tooHigh: count > 3e3,
      checked: Date.now(),
    });
  }, [parentNode, setNodeCount, dataAge]);

  if (!nodeCount.tooHigh) return null;

  return (
    <PopupMenu
      positioning="beneath-left"
      style={{
        position: "absolute",
        bottom: "1em",
        left: "1em",
        zIndex: 1,
      }}
      clickCatchStyle={{ opacity: 0.1 }}
      button={
        <Btn
          iconPath={mdiAlertOutline}
          color="warn"
          variant="filled"
          className="shadow"
        />
      }
      onClickClose={true}
    >
      <InfoRow variant="naked" color="warning">
        Too much data displayed. Reduce the number of rows or columns to improve
        responsiveness
      </InfoRow>
    </PopupMenu>
  );
};
