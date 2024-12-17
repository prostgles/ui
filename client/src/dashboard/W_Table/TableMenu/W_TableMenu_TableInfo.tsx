import {
  mdiDatabaseRefreshOutline,
  mdiDeleteOutline,
  mdiPencil,
} from "@mdi/js";
import { asName } from "prostgles-types";
import React from "react";
import type { W_TableMenuMetaProps } from "./W_TableMenu";
import Chip from "../../../components/Chip";
import Btn from "../../../components/Btn";
import CodeExample from "../../CodeExample";
import { FlexCol, FlexRowWrap } from "../../../components/Flex";

export const W_TableMenu_TableInfo = ({
  w,
  tableMeta,
  onSetQuery,
  prgl,
}: W_TableMenuMetaProps) => {
  const tableName = w.table_name;
  if (!tableMeta || !tableName) return null;

  return (
    <FlexCol className="f-1 ai-start o-auto ">
      <div className="f-1 flex-row mr-1 ai-center">
        <Chip className=" " variant="header" label={"Name"} value={tableName} />
        <Btn
          iconPath={mdiPencil}
          color="action"
          onClick={() => {
            onSetQuery({
              sql: `ALTER ${tableMeta.type.toUpperCase()} ${asName(tableName)} \nRENAME TO new_name`,
            });
          }}
        />
      </div>
      <div className="f-1  flex-row mr-1 ai-center">
        <Chip
          className=" "
          variant="header"
          label={"Comment"}
          value={tableMeta.comment}
        />
        <Btn
          color="action"
          iconPath={mdiPencil}
          onClick={() => {
            onSetQuery({
              sql: `COMMENT ON ${tableMeta.type.toUpperCase()} ${asName(tableName)} IS 'My comment';`,
            });
          }}
        />
      </div>
      <FlexRowWrap className="w-full  gap-0">
        <Chip
          className="f-1"
          variant="header"
          label={"OID"}
          value={w.table_oid}
        />
        <Chip
          className="f-1"
          variant="header"
          label={"Type"}
          value={tableMeta.type}
        />
        <Chip
          className="f-1 "
          variant="header"
          label={"Owner"}
          value={tableMeta.relowner_name}
        />
      </FlexRowWrap>
      <FlexRowWrap className="w-full">
        <Chip
          className="f-1"
          variant="header"
          label={"Actual Size"}
          value={tableMeta.sizeInfo?.["Actual Size"]}
        />
        <Chip
          className="f-1"
          variant="header"
          label={"Index Size"}
          value={tableMeta.sizeInfo?.["Index Size"]}
        />
        <Chip
          className="f-1"
          variant="header"
          label={"Total Size"}
          value={tableMeta.sizeInfo?.["Total Size"]}
        />
        <Chip
          className="f-1"
          variant="header"
          label={"Row count"}
          value={(+(tableMeta.sizeInfo?.["Row count"] || 0)).toLocaleString()}
        />
      </FlexRowWrap>
      {tableMeta.viewDefinition && (
        <FlexCol className="w-full" style={{ height: "400px" }}>
          <div className="bold p-0 w-fit mt-1">View definition</div>
          <CodeExample
            language="sql"
            value={tableMeta.viewDefinition}
            style={{ width: "100%", height: "400px", maxHeight: "60vh" }}
          />
        </FlexCol>
      )}
      <div className="flex-row-wrap gap-p5 mr-1 ai-center mt-auto ">
        {tableMeta.type === "Table" && (
          <>
            <Btn
              className="mr-1"
              iconPath={mdiDatabaseRefreshOutline}
              variant="outline"
              onClick={() => {
                onSetQuery({
                  sql: `VACUUM ${asName(tableName)} `,
                  title: `Garbage-collect and optionally analyze a database`,
                });
              }}
            >
              Vacuum
            </Btn>
            <Btn
              className="mr-1"
              iconPath={mdiDatabaseRefreshOutline}
              variant="outline"
              onClick={() => {
                onSetQuery({
                  sql: `VACUUM FULL ${asName(tableName)} `,
                  title: `Selects "full" vacuum, which can reclaim more space, but takes much longer and exclusively locks the table`,
                });
              }}
            >
              Vacuum Full
            </Btn>
          </>
        )}

        <Btn
          iconPath={mdiDeleteOutline}
          color="danger"
          variant="faded"
          onClick={() => {
            onSetQuery({
              sql: `DROP ${tableMeta.type.toUpperCase()} ${asName(tableName)} \n"remove this line to confirm"`,
              title: `${tableMeta.type} will be deleted from the database`,
              onSuccess: () => {
                prgl.dbs.windows.update(
                  { table_name: tableName },
                  { closed: true },
                );
                w.$update({ closed: true });
              },
            });
          }}
        >
          Drop...
        </Btn>
      </div>
    </FlexCol>
  );
};
