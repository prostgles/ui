import { mdiDatabaseRefreshOutline, mdiDelete, mdiPlus } from "@mdi/js";
import { asName } from "prostgles-types";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import Select from "../../../components/Select/Select";
import SmartCardList from "../../SmartCard/SmartCardList";
import type { W_TableMenuProps, W_TableMenuState } from "./W_TableMenu";
import type { W_TableInfo } from "./getTableMeta";

type P = W_TableMenuProps & {
  tableMeta: W_TableInfo | undefined;
  onSetQuery: (newQuery: W_TableMenuState["query"]) => void;
};
export const W_TableMenu_Indexes = ({
  tableMeta,
  onSetQuery,
  w,
  cols,
  prgl,
}: P) => {
  const tableName = w.table_name;
  if (!tableMeta || !tableName) return null;

  return (
    <FlexCol>
      <div className="ta-left p-p5">
        An index improves the speed of data retrieval operations on a table
      </div>
      <SmartCardList
        theme={prgl.theme}
        db={prgl.db as any}
        tableName={{
          sqlQuery: `
          SELECT tablename, indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = current_schema() AND format('%I', tablename) = \${tableName}
        `,
          dataAge: prgl.dbKey,
          args: { tableName },
        }}
        methods={prgl.methods}
        tables={prgl.tables}
        noDataComponent={<InfoRow color="info">No indexes</InfoRow>}
        fieldConfigs={[
          {
            name: "indexdef",
            label: "",
            render: (def) => (
              <div className="ws-pre-line">
                {def.replace(" ON ", " \nON ").replace(" USING ", " \nUSING ")}
              </div>
            ),
          },
          {
            name: "indexname",
            label: "",
            className: "show-on-parent-hover ml-auto",
            render: (indexname) => (
              <FlexRow className="">
                <Btn
                  title="Drop index..."
                  color="danger"
                  variant="faded"
                  iconPath={mdiDelete}
                  onClick={() => {
                    onSetQuery({
                      sql: `DROP INDEX ${JSON.stringify(indexname)}`,
                    });
                  }}
                />
                <Btn
                  title="Reindex"
                  iconPath={mdiDatabaseRefreshOutline}
                  variant="faded"
                  onClick={() => {
                    onSetQuery({
                      title: "Reindex",
                      contentTop: (
                        <>
                          REINDEX is similar to a drop and recreate of the index
                          in that the index contents are rebuilt from scratch.
                          <br></br>
                          If "CONCURRENTLY" is used PostgreSQL will rebuild the
                          index without taking any locks that prevent concurrent
                          inserts, updates, or deletes on the table
                        </>
                      ),
                      sql: `REINDEX INDEX ${asName(indexname)}`,
                    });
                  }}
                />
              </FlexRow>
            ),
          },
        ]}
      />
      <FlexRow className="ai-center ml-p5 f-0">
        <Select
          title="Alter this policy..."
          btnProps={{
            iconPath: mdiPlus,
            variant: "faded",
            color: "action",
            children: "Create",
          }}
          fullOptions={[
            {
              key: "B-Tree",
              subLabel:
                "Default. B-trees can handle equality and range queries on data that can be sorted into some ordering. Operators: \n<   <=   =   >=   >",
            },
            {
              key: "Hash",
              subLabel:
                "Hash indexes store a 32-bit hash code derived from the value of the indexed column. Operators: \n=",
            },
            {
              key: "GiST",
              subLabel:
                "Has many different indexing strategies. Operators: \n<<   &<   &>   >>   <<|   &<|   |&>   |>>   @>   <@   ~=   &&",
            },
            {
              key: "SP-GiST",
              subLabel:
                "Has a wide range of different non-balanced disk-based data structures, such as quadtrees, k-d trees, and radix trees (tries). Operators: \n<<   >>   ~=   <@   <<|   |>>",
            },
            {
              key: "GIN",
              subLabel: `“Inverted indexes” which are appropriate for data values that contain multiple component values, such as arrays. Operators: \n<@   @>   =   &&`,
            },
            {
              key: "BRIN",
              subLabel: `Most effective for columns whose values are well-correlated with the physical order of the table rows. Operators: \n<   <=   =   >=   >`,
            },
          ]}
          onChange={(val) => {
            onSetQuery({
              title: "Create index",
              sql: `CREATE INDEX ON public.${tableName} \nUSING ${val.toLowerCase().replaceAll("-", "")} (${cols.map((c) => c.name).join(", ")}) `,
            });
          }}
        />
        <Btn
          iconPath={mdiDatabaseRefreshOutline}
          variant="faded"
          onClick={() => {
            onSetQuery({
              title: "Reindex table",
              sql: `REINDEX TABLE ${tableName} `,
              contentTop: `REINDEX is similar to a drop and recreate of the index in that the index contents are rebuilt from scratch`,
            });
          }}
        >
          Reindex table
        </Btn>
      </FlexRow>
    </FlexCol>
  );
};
