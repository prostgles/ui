import { mdiSearchWeb } from "@mdi/js";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import SmartTable from "../../SmartTable";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";

type P = Pick<SmartFormFieldLinkedDataProps, "db" | "methods" | "tables"> & {
  ftable: string;
  fcol: string;
  readOnly: boolean;
  onChange: (newData: any) => void;
};

export const SmartFormFieldLinkedDataSearch = ({
  onChange,
  tables,
  methods,
  db,
  ftable,
  fcol,
  readOnly,
}: P) => {
  const [show, setShow] = useState(false);

  return (
    <>
      <Btn
        iconPath={mdiSearchWeb}
        title="Find record"
        onClick={() => setShow(true)}
      />
      {show && (
        <SmartTable
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
        />
      )}
    </>
  );
};
