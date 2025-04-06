import { mdiSearchWeb } from "@mdi/js";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import Popup from "../../../components/Popup/Popup";
import SmartCardList from "../../SmartCard/SmartCardList";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";

type P = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables" | "row" | "column"
> & {
  ftable: string;
  fcol: string;
  readOnly: boolean;
};

export const SmartFormFieldLinkedDataSearch = ({
  tables,
  methods,
  db,
  ftable,
  fcol,
  row,
  column,
}: P) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();

  return (
    <>
      <Btn
        iconPath={mdiSearchWeb}
        title="View more"
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
      />
      {anchorEl && (
        <Popup
          title={`Find ${ftable} record`}
          onClose={() => setAnchorEl(undefined)}
          onClickClose={false}
          positioning="top-center"
          clickCatchStyle={{ opacity: 1 }}
          rootStyle={{
            maxWidth: "min(100vw, 600px)",
          }}
        >
          <SmartCardList
            showTopBar={true}
            db={db}
            methods={methods}
            tables={tables}
            tableName={ftable}
            filter={{
              [fcol]: row[column.name],
            }}
          />
          {/* <SmartTable
            allowEdit={true}
            title={`Find ${ftable} record`}
            db={db}
            methods={methods}
            tables={tables}
            tableName={ftable}
            onClickRow={(row) => {
              if (!row) return;

              if (readOnly) {
                alert("Cannot change value. This field is read only");
              } else {
                onChange(row[fcol]);
              }
              setShow(false);
            }}
            onClosePopup={() => {
              setShow(false);
            }}
          /> */}
        </Popup>
      )}
    </>
  );
};
