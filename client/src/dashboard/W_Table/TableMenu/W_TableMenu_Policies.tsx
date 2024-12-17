import React from "react";
import type { W_TableInfo } from "./getTableMeta";
import type { AnyObject } from "prostgles-types";
import { asName } from "prostgles-types";
import { mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import Btn from "../../../components/Btn";
import SmartCardList from "../../SmartCard/SmartCardList";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../components/Flex";
import type { W_TableMenuProps, W_TableMenuState } from "./W_TableMenu";
import { InfoRow } from "../../../components/InfoRow";
import { SwitchToggle } from "../../../components/SwitchToggle";
import Select from "../../../components/Select/Select";
import { PG_OBJECT_QUERIES } from "../../SQLEditor/SQLCompletion/getPGObjects";

type P = W_TableMenuProps & {
  tableMeta: W_TableInfo | undefined;
  onSetQuery: (newQuery: W_TableMenuState["query"]) => void;
};
export const W_TableMenu_Policies = ({ tableMeta, onSetQuery, prgl, w }: P) => {
  const tableName = w.table_name;
  if (!tableMeta || !tableName) return null;
  const AlterQuery = `ALTER TABLE ${tableName}`;
  return (
    <FlexCol className="ai-start o-auto">
      <div className="ta-left p-p5">
        When row level security is enabled all normal access to the table for
        selecting or modifying rows must be allowed by a row security policy.
        <br />
        <br />
        Superusers and roles with the BYPASSRLS attribute always bypass the row
        security system when accessing a table.
        <br />
        Table owners normally bypass row security as well, though a table owner
        can choose to be subject to row security with ALTER TABLE ... FORCE ROW
        LEVEL SECURITY.
      </div>
      <FlexRowWrap>
        <SwitchToggle
          label="Row Level Security"
          checked={tableMeta.relrowsecurity}
          onChange={(val) => {
            onSetQuery({
              label: "Row Level Security",
              sql: `${AlterQuery}\n${val ? "ENABLE" : "DISABLE"} ROW LEVEL SECURITY;`,
            });
          }}
        />
        <SwitchToggle
          label="Forced Row Level Security"
          checked={tableMeta.relforcerowsecurity}
          onChange={(val) => {
            onSetQuery({
              label: "Force Row Level Security",
              sql: `${AlterQuery}\n${val ? "" : "NO "}FORCE ROW LEVEL SECURITY;`,
            });
          }}
        />
        <Select
          emptyLabel={"Toggle RLS for all tables"}
          fullOptions={[
            {
              key: "ENABLE",
              subLabel: "ENABLE ROW LEVEL SECURITY for all tables",
            },
            {
              key: "DISABLE",
              subLabel: "DISABLE ROW LEVEL SECURITY for all tables",
            },
          ]}
          onChange={(val) => {
            onSetQuery({
              title: `${val} Row Level Security for all tables in current schema`,
              sql: getAllTableRLSQuery(val),
            });
          }}
        />
      </FlexRowWrap>
      <SmartCardList
        theme={prgl.theme}
        db={prgl.db as any}
        methods={prgl.methods}
        tables={prgl.tables}
        tableName={{
          dataAge: prgl.dbKey,
          sqlQuery: PG_OBJECT_QUERIES.policies.sql(tableName),
          args: { tableName },
        }}
        noDataComponent={<InfoRow color="info">No policies</InfoRow>}
        fieldConfigs={[
          {
            name: "definition",
            label: "",
            render: (v) => <div className="ws-pre-line">{v}</div>,
          },
          {
            name: "tablename",
            label: "",
            className: "show-on-parent-hover",
            render: (v, row: AnyObject) => (
              <FlexCol>
                <Select
                  title="Alter this policy..."
                  btnProps={{
                    iconPath: mdiPencil,
                    variant: "faded",
                    children: "",
                  }}
                  fullOptions={[
                    {
                      key: "RENAME TO",
                      subLabel: "Change the name of the policy",
                    },
                    {
                      key: "TO",
                      subLabel: "Change who the policy applies to",
                    },
                    {
                      key: "USING",
                      subLabel:
                        "Change which rows (or the condition) the policy applies to",
                    },
                    {
                      key: "WITH CHECK",
                      subLabel:
                        "Change condition used to validate INSERT and UPDATE queries",
                    },
                  ]}
                  onChange={(val) => {
                    onSetQuery({
                      sql:
                        `ALTER POLICY ${row.escaped_identifier} ON ${tableName}\n${val} ` +
                        (val === "WITH CHECK" ? row.with_check
                        : val === "USING" ? (row.using ?? "")
                        : val === "TO" ? (row.roles ?? "")
                        : ""),
                      title: "Alter policy",
                    });
                  }}
                />
                <Btn
                  title="Delete this policy..."
                  iconPath={mdiDelete}
                  color="danger"
                  variant="faded"
                  onClick={() =>
                    onSetQuery({
                      sql: `DROP POLICY ${row.escaped_identifier} ON ${tableName}`,
                    })
                  }
                />
              </FlexCol>
            ),
          },
        ]}
      />
      <Btn
        color="action"
        variant="faded"
        className="ml-p5"
        iconPath={mdiPlus}
        onClick={() =>
          onSetQuery({
            sql: [
              `CREATE POLICY new_policy_name`,
              `ON ${tableName}`,
              `FOR ALL`,
            ].join("\n"),
          })
        }
      >
        Create policy
      </Btn>
    </FlexCol>
  );
};

const getAllTableRLSQuery = (value: "ENABLE" | "DISABLE") => {
  return `DO $$
DECLARE
  row record;
BEGIN
  FOR row IN SELECT tablename FROM pg_tables AS t
    WHERE t.schemaname = CURRENT_SCHEMA -- Add custom filter here, if desired.
  LOOP
    EXECUTE format('ALTER TABLE %I ${value} ROW LEVEL SECURITY;', row.tablename); -- Toggle RLS for tables
  END LOOP;
END; $$;`;
};
