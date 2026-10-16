import Chip from "@components/Chip";
import Popup from "@components/Popup/Popup";
import PopupMenu from "@components/PopupMenu";
import React, { useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import CodeExample from "../CodeExample";

export const StatusMonitorBlockedByPid = ({ pid }: { pid: number }) => {
  const [show, setShow] = useState(false);
  const { dbsSql } = usePrglCore();
  return (
    <>
      <Chip key={pid} className="mt-p25" color="red">
        {pid}
      </Chip>
      {show && (
        <Popup
          title={`Query for ${pid}`}
          onClose={() => {
            setShow(false);
          }}
        >
          {/* <CodeExample
            value={query}
            language="sql"
            style={{
              minWidth: "450px",
              minHeight: "450px",
            }}
          /> */}
        </Popup>
      )}
    </>
  );
};
