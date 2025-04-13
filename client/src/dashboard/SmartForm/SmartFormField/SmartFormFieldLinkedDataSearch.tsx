import { mdiSearchWeb } from "@mdi/js";
import React, { useMemo, useState } from "react";
import Btn from "../../../components/Btn";
import Popup from "../../../components/Popup/Popup";
import {
  SmartCardList,
  type SmartCardListProps,
} from "../../SmartCardList/SmartCardList";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";
import type { SmartGroupFilter } from "../../../../../commonTypes/filterUtils";

type P = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables" | "row" | "column"
> & {
  ftable: string;
  fcol: string;
  readOnly: boolean;
  onChange: (value: any) => void;
};

export const SmartFormFieldLinkedDataSearch = ({
  tables,
  methods,
  db,
  ftable,
  fcol,
  row,
  column,
  readOnly,
  onChange,
}: P) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();
  const [loaded, setLoaded] = useState(false);

  const listProps = useMemo(() => {
    return {
      onClickRow:
        readOnly ? undefined : (
          (row) => {
            onChange(row[fcol]);
            setAnchorEl(undefined);
          }
        ),
      searchFilter: [
        {
          fieldName: fcol,
          value: row[column.name],
        },
      ],
      onSetData: () => {
        setLoaded(true);
      },
    } satisfies Pick<
      SmartCardListProps,
      "searchFilter" | "onClickRow" | "onSetData"
    >;
  }, [row, column.name, fcol, onChange, readOnly]);

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
          anchorEl={anchorEl}
          onClickClose={false}
          positioning="left"
          clickCatchStyle={{ opacity: 1 }}
          rootStyle={{
            maxWidth: "min(100vw, 600px)",
            visibility: loaded ? "visible" : "hidden",
          }}
        >
          <SmartCardList
            showTopBar={true}
            db={db}
            methods={methods}
            tables={tables}
            tableName={ftable}
            excludeNulls={true}
            {...listProps}
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
