import React from "react";
import { InfoRow } from "../../../components/InfoRow";
import { LabeledRow } from "../../../components/LabeledRow";
import { areEqual } from "../../../utils";
import type { EditedAccessRule } from "../AccessControl";
import type { DBPermissionEditorProps } from "./PCustomTables";
import { SwitchToggle } from "../../../components/SwitchToggle";
import { usePromise } from "prostgles-client/dist/react-hooks";

export const getPRunSQLErrors = (rule: EditedAccessRule) => {
  if (rule.dbPermissions.type === "Run SQL" && !rule.dbPermissions.allowSQL) {
    return `Must tick "Run SQL" checkbox`;
  }
};

export const PRunSQL = ({
  dbPermissions,
  onChange,
  dbsConnection,
  prgl: { connection, db },
}: DBPermissionEditorProps<"Run SQL">) => {
  const roleInfo = usePromise(async () => {
    return (await db.sql!(
      `
      SELECT r.rolname, r.rolsuper, r.rolinherit, r.rolcreaterole, r.rolcreatedb, r.rolcanlogin, r.rolconnlimit, r.rolvaliduntil, r.rolreplication, r.rolbypassrls
      FROM pg_catalog.pg_roles r
      WHERE r.rolname = current_user
      `,
      {},
      { returnType: "row" },
    )) as {
      rolname: string;
      rolsuper: boolean;
      rolinherit: boolean;
      rolcreaterole: boolean;
      rolcreatedb: boolean;
      rolcanlogin: boolean;
      rolconnlimit: number;
      rolvaliduntil: Date | null;
      rolreplication: boolean;
      rolbypassrls: boolean;
    };
  });

  const superAccessToSameServerAsDBS = areEqual(connection, dbsConnection, [
    "db_host",
    "db_port",
  ]);

  return (
    <>
      <div className="PRunSQL my-1 ws-pre flex-col">
        <div className="flex-col gap-p5  my-2d">
          {roleInfo?.rolsuper && superAccessToSameServerAsDBS ?
            <InfoRow color="warning">
              This rule will allow <strong>superuser</strong> access to state
              database server{" "}
              <strong>
                {dbsConnection.db_host}:{dbsConnection.db_port}
              </strong>
              <br></br>
              <br></br>
              User may update their privilege to the same level of access as a
              type <strong>"admin"</strong> user
            </InfoRow>
          : roleInfo?.rolsuper ?
            <InfoRow color="warning">
              Superuser access (Bypasses all permission checks, except the right
              to log in. This is a dangerous privilege and should not be used
              carelessly)
            </InfoRow>
          : <LabeledRow label="PG Role Attributes" className="ws-wrap">
              {[
                roleInfo?.rolsuper && "Superuser",
                roleInfo?.rolcreatedb && "CreateDB",
                roleInfo?.rolcreaterole && "CreateRole",
                roleInfo?.rolinherit && "Inherit",
                roleInfo?.rolbypassrls && "BypassRLS",
                roleInfo?.rolcanlogin && "Login",
                roleInfo?.rolvaliduntil &&
                  "Valid Until" + roleInfo.rolvaliduntil,
              ].filter((v) => v)}
            </LabeledRow>
          }
        </div>
      </div>
      <SwitchToggle
        label="Run SQL"
        checked={!!dbPermissions.allowSQL}
        onChange={(allowSQL) => {
          onChange({
            type: "Run SQL",
            allowSQL,
          });
        }}
      />
    </>
  );
};
