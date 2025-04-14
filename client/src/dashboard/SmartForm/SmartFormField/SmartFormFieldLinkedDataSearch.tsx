import { mdiSearchWeb } from "@mdi/js";
import React, { useMemo, useState } from "react";
import Btn from "../../../components/Btn";
import Popup from "../../../components/Popup/Popup";
import {
  SmartCardList,
  type SmartCardListProps,
} from "../../SmartCardList/SmartCardList";
import type { SmartFormFieldLinkedDataProps } from "./SmartFormFieldLinkedData";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { SmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import type { AnyObject } from "prostgles-types";

type P = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables" | "row" | "column"
> & {
  ftable: DBSchemaTableWJoins;
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
  const listProps = useMemo(() => {
    return {
      onClickRow:
        readOnly ? undefined : (
          (row) => {
            onChange(row[fcol]);
          }
        ),
      searchFilter: [
        {
          fieldName: fcol,
          value: row[column.name],
        },
      ],
    } satisfies Pick<SmartCardListProps, "searchFilter" | "onClickRow">;
  }, [row, column.name, fcol, onChange, readOnly]);

  return (
    <ViewMoreSmartCardList
      db={db}
      tables={tables}
      methods={methods}
      ftable={ftable}
      {...listProps}
    />
  );
};

type ViewMoreSmartCardListProps = Pick<
  SmartFormFieldLinkedDataProps,
  "db" | "methods" | "tables"
> & {
  ftable: DBSchemaTableWJoins;
  searchFilter: SmartGroupFilter | undefined;
  onClickRow: ((row: AnyObject) => void) | undefined;
};
export const ViewMoreSmartCardList = ({
  db,
  methods,
  ftable,
  tables,
  searchFilter,
  onClickRow,
}: ViewMoreSmartCardListProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement>();
  const [loaded, setLoaded] = useState(false);

  const listProps = useMemo(() => {
    return {
      onClickRow:
        onClickRow ?
          (row) => {
            onClickRow(row);
            setAnchorEl(undefined);
          }
        : undefined,
      onSetData: () => {
        setLoaded(true);
      },
    } satisfies Pick<SmartCardListProps, "onSetData" | "onClickRow">;
  }, [onClickRow]);

  return (
    <>
      <Btn
        iconPath={mdiSearchWeb}
        title="View more"
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
      />
      {anchorEl && (
        <Popup
          title={ftable.label}
          onClose={() => setAnchorEl(undefined)}
          anchorEl={anchorEl}
          onClickClose={false}
          positioning="left"
          clickCatchStyle={{ opacity: 1 }}
          rootStyle={{
            maxWidth: "min(100vw, 600px)",
            transition: "opacity .15s ease-in-out",
            visibility: loaded ? "visible" : "hidden",
          }}
        >
          <SmartCardList
            showTopBar={true}
            db={db}
            methods={methods}
            tables={tables}
            tableName={ftable.name}
            excludeNulls={true}
            searchFilter={searchFilter}
            {...listProps}
          />
        </Popup>
      )}
    </>
  );
};
