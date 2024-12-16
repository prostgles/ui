import { mdiDelete, mdiPlus } from "@mdi/js";
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
export const W_TableMenu_Constraints = ({
  tableMeta,
  onSetQuery,
  w,
  prgl,
}: P) => {
  const tableName = w.table_name;
  if (!tableMeta || !tableName) return null;

  return (
    <FlexCol className="flex-col ai-start o-auto ws-pre">
      <div className="ta-left p-p5">
        Constraints set rules on the type of data that can be stored in columns
      </div>
      <SmartCardList
        theme={prgl.theme}
        db={prgl.db as any}
        tableName={{
          dataAge: prgl.dbKey,
          sqlQuery: `
            SELECT conname, pg_get_constraintdef(c.oid) as definition 
            FROM pg_catalog.pg_constraint c
            INNER JOIN pg_catalog.pg_class rel
              ON rel.oid = c.conrelid
            INNER JOIN pg_catalog.pg_namespace nsp
              ON nsp.oid = connamespace
            WHERE nsp.nspname = 'public'
            AND rel.relname = \${tableName}
          `,
          args: { tableName },
        }}
        methods={prgl.methods}
        tables={prgl.tables}
        noDataComponent={<InfoRow color="info">No constraints</InfoRow>}
        fieldConfigs={[
          {
            name: "definition",
            label: "",
            render: (definition, row) => (
              <div className="ws-pre-line">
                <span className="text-2">
                  ALTER TABLE {tableName}
                  <br></br>
                  ADD CONSTRAINT {row.conname}
                </span>
                <br></br>
                {definition}
              </div>
            ),
          },
          {
            name: "conname",
            label: "",
            className: "show-on-parent-hover ml-auto",
            render: (conname) => (
              <FlexRow className="">
                <Btn
                  title="Drop constraint..."
                  color="danger"
                  variant="faded"
                  iconPath={mdiDelete}
                  onClick={() => {
                    onSetQuery({
                      sql: `ALTER TABLE ${JSON.stringify(tableName)} DROP CONSTRAINT ${JSON.stringify(conname)}`,
                    });
                  }}
                />
              </FlexRow>
            ),
          },
        ]}
      />
      <Select
        title="Create constraint..."
        className="ml-p5"
        btnProps={{
          iconPath: mdiPlus,
          variant: "faded",
          color: "action",
          children: "Create",
        }}
        fullOptions={[
          {
            key: "PRIMARY KEY",
            subLabel:
              "A column or a group of columns used to identify a row uniquely in a table",
          },
          {
            key: "FOREIGN KEY",
            subLabel:
              "reference the primary key (or unique columns) of another table",
          },
          {
            key: "CHECK",
            subLabel:
              "Condition for row values before they are inserted or updated to the column",
          },
          {
            key: "UNIQUE",
            subLabel: "Similar to primary key except it allows null values",
          },
          {
            key: "WITH CHECK",
            subLabel:
              "Change condition used to validate INSERT and UPDATE queries",
          },
        ]}
        onChange={(val) => {
          onSetQuery({
            title: "Add constraint",
            sql: `ALTER TABLE ${tableName} ADD ${val}`,
          });
        }}
      />
    </FlexCol>
  );
};
