import { mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import { asName } from "prostgles-types";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import { SwitchToggle } from "../../../components/SwitchToggle";
import SmartCardList from "../../SmartCard/SmartCardList";
import type { W_TableMenuProps, W_TableMenuState } from "./W_TableMenu";
import type { W_TableInfo } from "./getTableMeta";

type P = W_TableMenuProps & {
  tableMeta: W_TableInfo | undefined;
  onSetQuery: (newQuery: W_TableMenuState["query"]) => void;
};
export const W_TableMenu_Triggers = ({ tableMeta, onSetQuery, w, prgl }: P) => {
  const tableName = w.table_name;
  if (!tableMeta || !tableName) return null;

  return (
    <FlexCol className=" ">
      <div className="ta-left p-p5">
        A trigger is used to execute a function before or after any of these
        commands: INSERT, UPDATE, or DELETE
      </div>
      {!!tableMeta.triggers.length && (
        <div className="flex-row ai-center ">
          <Btn
            className="f-0 mr-1 "
            color="action"
            variant="faded"
            disabledInfo={
              tableMeta.triggers.every((t) => t.disabled) ?
                "Already disabled"
              : undefined
            }
            onClick={() => {
              onSetQuery({
                sql: `ALTER TABLE ${asName(tableName)} DISABLE TRIGGER ALL`,
              });
            }}
          >
            Disable all triggers
          </Btn>
          <Btn
            // iconPath={mdiPlus}
            className="  f-0"
            disabledInfo={
              !tableMeta.triggers.every((t) => t.disabled) ?
                "Already enabled"
              : undefined
            }
            variant="outline"
            onClick={() => {
              onSetQuery({
                sql: `ALTER TABLE ${asName(tableName)} ENABLE TRIGGER ALL`,
              });
            }}
          >
            Enable all triggers
          </Btn>
        </div>
      )}

      <SmartCardList
        db={prgl.db as any}
        theme={prgl.theme}
        tableName={{
          dataAge: prgl.dbKey,
          sqlQuery: ` 
            SELECT event_object_table
              ,trigger_name
              ,event_manipulation
              ,action_statement
              ,action_timing
              ,pg_get_triggerdef(oid) as trigger_def
              ,tgenabled = 'D' as disabled
              ,CASE WHEN pg_catalog.starts_with(action_statement, 'EXECUTE FUNCTION ') THEN pg_get_functiondef(RIGHT(action_statement, -17 )::regprocedure) ELSE '' END as function_def
            FROM  information_schema.triggers t
            LEFT JOIN pg_catalog.pg_trigger pt
            ON t.trigger_name = pt.tgname
            WHERE event_object_table = \${tableName}
            ORDER BY event_object_table, event_manipulation
          `,
          args: { tableName },
        }}
        methods={prgl.methods}
        tables={prgl.tables}
        noDataComponent={<InfoRow color="info">No triggers</InfoRow>}
        fieldConfigs={[
          {
            name: "event_object_table",
            label: "",
            render: (_, t: AnyObject) => (
              <FlexRow>
                <div className="ws-pre-line">
                  {t.trigger_def
                    .replace(" BEFORE ", "\nBEFORE ")
                    .replace(" AFTER ", "\nAFTER ")
                    .replace(" ON ", "\nON ")
                    .replace(" REFERENCING ", "\nREFERENCING ")
                    .replace(" FOR ", "\nFOR ")
                    .replace(" EXECUTE ", "\nEXECUTE ")}
                </div>
              </FlexRow>
            ),
          },
          {
            name: "trigger_name",
            label: "",
            className: "ml-auto show-on-parent-hover ",
            render: (_, t: AnyObject) => (
              <FlexRow className="">
                <Btn
                  iconPath={mdiPencil}
                  title="Edit trigger function"
                  color="action"
                  variant="faded"
                  onClick={() => {
                    onSetQuery({
                      sql: t.function_def,
                    });
                  }}
                />

                <Btn
                  title="Drop trigger"
                  iconPath={mdiDelete}
                  color="danger"
                  variant="faded"
                  onClick={() => {
                    onSetQuery({
                      sql: `DROP TRIGGER ${asName(t.trigger_name)} ON ${asName(tableName)} ;`,
                    });
                  }}
                />
              </FlexRow>
            ),
          },
          {
            name: "disabled",
            label: "",
            render: (_, t) => (
              <SwitchToggle
                title={t.disabled ? "Disabled" : "Enabled"}
                checked={!t.disabled}
                onChange={(checked) => {
                  onSetQuery({
                    sql: `ALTER TABLE ${asName(tableName)} \n${!checked ? "DISABLE" : "ENABLE"} TRIGGER ${JSON.stringify(t.trigger_name)};`,
                  });
                }}
              />
            ),
          },
        ]}
      />
      <Btn
        iconPath={mdiPlus}
        color="action"
        variant="faded"
        onClick={() => {
          onSetQuery({ sql: getTriggerQuery(tableName) });
        }}
      >
        Add trigger
      </Btn>
    </FlexCol>
  );
};

const getTriggerQuery = (tableName: string) => {
  return `CREATE FUNCTION ${asName("trig_func_" + tableName)}() 
RETURNS TRIGGER AS $func$ 
  DECLARE
    name1 varchar(30);
    name2 varchar(30);
  BEGIN

  RETURN NULL;    
  END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER ${asName("trig_" + tableName)}
AFTER INSERT 
ON ${asName(tableName)}
REFERENCING NEW TABLE AS new
FOR EACH ROW 
EXECUTE PROCEDURE ${asName("trig_func_" + tableName)}();
`;
};
