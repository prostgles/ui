import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import type { Prgl } from "../../../App";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import PopupMenu from "../../../components/PopupMenu";
import CodeExample from "../../CodeExample";
import type { EditedAccessRule } from "../AccessControl";
import { ACCESS_RULE_METHODS } from "../AccessRuleSummary";
import { getComparablePGPolicy } from "./getComparablePGPolicy";
import { fixIndent } from "../../../demo/sqlVideoDemo";

export const ComparablePGPolicies = ({
  prgl,
  rule,
}: {
  prgl: Prgl;
  rule: EditedAccessRule;
}) => {
  const policies = usePromise(async () => {
    const { tables } = prgl;
    const userTypes = rule.access_control_user_types[0]?.ids ?? [];
    const r = rule.dbPermissions;
    if (r.type === "Run SQL") {
      return [""];
    }
    if (r.type === "All views/tables") {
      const table_policies = await Promise.all(
        tables.map(async (table) => {
          return await Promise.all(
            r.allowAllTables.map((command) => {
              return getComparablePGPolicy({
                excludeRLSStatement: true,
                table,
                userTypes,
                prgl,
                forcedFilterDetailed: { $and: [] },
                checkFilterDetailed: undefined,
                forcedDataDetail: undefined,
                ...(command === "select" ?
                  {
                    command: "SELECT",
                  }
                : command === "insert" ?
                  {
                    command: "INSERT",
                    rule: { fields: "*" },
                  }
                : command === "update" ?
                  {
                    command: "UPDATE",
                    rule: { fields: "*" },
                  }
                : {
                    command: "DELETE",
                    rule: { filterFields: "*" },
                  }),
              });
            }),
          );
        }),
      );

      return table_policies.flat();
    } else {
      return await Promise.all(
        r.customTables.map(async (tablePermission) => {
          const table = tables.find(
            (t) => t.name === tablePermission.tableName,
          );
          if (!table) return "";
          const commands = ACCESS_RULE_METHODS.filter(
            (m) => tablePermission[m],
          );
          const commandPolicies = await Promise.all(
            commands.map((command) => {
              const commandRule = tablePermission[command] as any;
              return getComparablePGPolicy({
                excludeRLSStatement: true,
                table,
                userTypes,
                prgl,
                ...(command === "select" ?
                  {
                    command: "SELECT",
                    ...commandRule,
                  }
                : command === "insert" ?
                  {
                    command: "INSERT",
                    ...commandRule,
                  }
                : command === "update" ?
                  {
                    command: "UPDATE",
                    ...commandRule,
                  }
                : {
                    command: "DELETE",
                    ...commandRule,
                  }),
              });
            }),
          );

          return commandPolicies.join("\n\n");
        }),
      );
    }
  }, [prgl, rule]);

  const query =
    fixIndent(`
    /* Drop all existing policies */
    DO
    $$
    DECLARE
    pol RECORD;
    BEGIN
      FOR pol IN (SELECT polname AS name, polrelid::regclass AS table FROM pg_policy)
      LOOP
        EXECUTE format('DROP POLICY %I ON %I', pol.name, pol.table);
      END LOOP;
    END;
    $$;

    /* Enable RLS for all tables */
    DO $$
    DECLARE
      tbl record;
    BEGIN
      FOR tbl IN SELECT tablename FROM pg_tables AS t
        WHERE t.schemaname = CURRENT_SCHEMA 
      LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl.tablename); 
      END LOOP;
    END; $$;

    /* It is recommended to create a non superuser pg account with read/write permissions to all relevant tables */
    CREATE USER my_user WITH ENCRYPTED PASSWORD 'my_password';
    GRANT ${ACCESS_RULE_METHODS.map((a) => a.toUpperCase()).join(", ")} ON ALL TABLES IN SCHEMA public TO my_user;

    /* Comparable policies */
  `) +
    "\n" +
    (policies ?? []).join("\n");

  return (
    <PopupMenu
      className="ComparablePGPolicies mt-1"
      positioning="fullscreen"
      title="Comparable Postgres Policies"
      clickCatchStyle={{ opacity: 0.5 }}
      button={
        <Btn color="action" data-command="ComparablePGPolicies">
          Comparable PG Policies
        </Btn>
      }
      render={(pClose) => (
        <FlexCol className="f-1">
          <InfoRow variant="naked">
            Some features like limiting read/write access to specific columns
            cannot be easily achieved with Postgres
            <br />
            The policies below limit which rows can be read/modified (USING
            clause) ensuring updated/inserted rows satisfy specific conditions
            (CHECK clause)
          </InfoRow>
          <CodeExample
            language="sql"
            style={{ minWidth: "500px", minHeight: "500px" }}
            value={query}
          />
        </FlexCol>
      )}
    />
  );
};
