import React from "react";

import { mdiDelete } from "@mdi/js";
import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { classOverride, FlexCol } from "../../components/Flex";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { SmartCard } from "../SmartCard/SmartCard";
import type { SmartFormProps } from "../SmartForm/SmartForm";
import {
  getKeyForRowData,
  useGetRowKeyCols,
  useSmartCardListStyle,
  type SmartCardListProps,
} from "./SmartCardList";

export type P = Pick<Prgl, "db" | "tables" | "methods"> &
  Pick<SmartCardListProps, "noDataComponent" | "noDataComponentMode"> & {
    className?: string;
    style?: React.CSSProperties;
    excludeNulls?: boolean;
    tables: CommonWindowProps["tables"];
    onSuccess: SmartFormProps["onSuccess"];
    table: DBSchemaTableWJoins;
    data: AnyObject[];
    onChange: (newData: AnyObject[]) => void;
  };

export const SmartCardListJoinedNewRecords = (props: P) => {
  const {
    db,
    methods,
    tables,
    className = "",
    style = {},
    excludeNulls,
    onSuccess,
    onChange,
    data,
    table,
    noDataComponent,
    noDataComponentMode,
  } = props;
  const smartCardListStyle = useSmartCardListStyle(style);

  const { keyCols } = useGetRowKeyCols(table.columns, data[0] ?? {});

  /** Used to prevent subsequent flickers during filter change if no items */
  const showNoDataComponent = noDataComponent && !data.length;
  if (showNoDataComponent && noDataComponentMode === "hide-all") {
    return noDataComponent;
  }

  return (
    <FlexCol
      className={classOverride(
        "SmartCardList o-auto gap-p5 relative ",
        className,
      )}
      data-command="SmartCardList"
      style={smartCardListStyle}
    >
      {data.map((defaultData, i) => {
        return (
          <div key={getKeyForRowData(defaultData, keyCols)}>
            <SmartCard
              db={db as DBHandlerClient}
              methods={methods}
              tables={tables}
              tableName={table.name}
              defaultData={defaultData}
              columns={table.columns}
              excludeNulls={excludeNulls}
              smartFormProps={{ onSuccess }}
            />
            <Btn
              iconPath={mdiDelete}
              color="danger"
              className="absolute"
              style={{ top: "5px", right: "5px" }}
              onClick={() => {
                onChange(props.data.filter((_, di) => di !== i));
              }}
            />
          </div>
        );
      })}
    </FlexCol>
  );
};
