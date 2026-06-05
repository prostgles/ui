import Btn from "@components/Btn";
import { ExpandSection } from "@components/ExpandSection";
import { FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiDotsHorizontal } from "@mdi/js";
import React from "react";
import { t } from "../../i18n/i18nUtils";
import type { NewConnectionFormProps } from "./NewConnectionFormFields";
import { SSL_MODES } from "./newConnectionUtils";
import { SchemaFilter } from "./SchemaFilter";

export const NewConnectionFormOptions = (
  props: Pick<
    NewConnectionFormProps,
    "c" | "updateConnection" | "dbProps" | "isForStateDB"
  >,
) => {
  const { c, updateConnection, isForStateDB, dbProps } = props;
  const databaseSslMode = "db_ssl" in c ? c.db_ssl || "disable" : "disabled";

  const { dbsTables, dbsMethods, sql } = dbProps ?? {};

  const cTable = dbsTables?.find((t) => t.name === "connections");
  return (
    <>
      <ExpandSection
        label={t.NewConnectionForm["More options"]}
        buttonProps={{
          variant: undefined,
          color: "action",
          iconPath: mdiDotsHorizontal,
          "data-command": "NewConnectionForm.MoreOptionsToggle",
        }}
      >
        <SchemaFilter
          db_schema_filter={c.db_schema_filter}
          sql={sql}
          onChange={(newDbSchemaFilter) => {
            updateConnection({
              type: "Standard",
              db_schema_filter: newDbSchemaFilter,
            });
          }}
          asSelect={undefined}
        />
        <FormField
          id="timeout"
          label={t.NewConnectionForm["Connection timeout (ms)"]}
          data-command="NewConnectionForm.connectionTimeout"
          optional={true}
          value={c.db_connection_timeout}
          onChange={(db_connection_timeout) => {
            updateConnection({ db_connection_timeout, type: "Standard" });
          }}
        />
        <FormField
          id="ssl_mode"
          label={t.NewConnectionForm["SSL Mode"]}
          data-command="NewConnectionForm.sslMode"
          fullOptions={SSL_MODES}
          required={true}
          value={c.db_ssl}
          onChange={(db_ssl: (typeof SSL_MODES)[number]["key"]) => {
            // if(c.type === "Connection URI"){
            //   const con = await dbsMethods?.validateConnection?.({ ...c, db_ssl, type: "Standard" });
            //   console.log(con);
            // }
            /** Switch to standard to ensure the db_conn is updated accordingly */
            void updateConnection({ db_ssl, type: "Standard" });
          }}
        />
        {["verify-ca", "verify-full", "require", "prefer", "allow"].includes(
          databaseSslMode,
        ) && (
          <>
            <FormField
              id="ssl_cert"
              label={t.NewConnectionForm["CA Certificate"]}
              type="file"
              labelStyle={{ flex: "unset" }}
              onChange={async (files) => {
                const file = files[0];
                void updateConnection({
                  ssl_certificate: (await file?.text()) ?? undefined,
                });
              }}
            />
            <FormField
              id="ssl_client_cert"
              label="Client Certificate"
              type="file"
              labelStyle={{ flex: "unset" }}
              onChange={async (files) => {
                const file = files[0];
                void updateConnection({
                  ssl_client_certificate: (await file?.text()) ?? undefined,
                });
              }}
            />
            <FormField
              id="ssl_client_cert_key"
              label={t.NewConnectionForm["Client Key"]}
              type="file"
              labelStyle={{ flex: "unset" }}
              onChange={async (files) => {
                const file = files[0];
                void updateConnection({
                  ssl_client_certificate_key: (await file?.text()) ?? undefined,
                });
              }}
            />
            <FormField
              id="ssl_rejectUnauthorized"
              label={t.NewConnectionForm["Reject unauthorized"]}
              type="checkbox"
              labelStyle={{ flex: "unset" }}
              nullable={true}
              value={c.ssl_reject_unauthorized}
              onChange={(ssl_reject_unauthorized) => {
                updateConnection({ ssl_reject_unauthorized });
              }}
              hint={
                cTable?.columns.find(
                  (c) => c.name === "ssl_reject_unauthorized",
                )?.hint
              }
            />
          </>
        )}
      </ExpandSection>
      {!isForStateDB && (
        <>
          <FlexRow className="mt-1">
            <SwitchToggle
              id="swatch"
              label={{
                label: t.NewConnectionForm["Watch schema"],
                info: t.NewConnectionForm[
                  "Will refresh the dashboard and API on schema change. Requires superuser for best experience"
                ],
              }}
              data-command="NewConnectionForm.watchSchema"
              checked={!!c.db_watch_schema}
              onChange={(db_watch_schema) => {
                updateConnection({ db_watch_schema });
              }}
            />
            {dbsMethods?.reloadSchema && (
              <Btn
                onClickPromise={() =>
                  dbsMethods.reloadSchema!({ conId: c.id! })
                }
                color="action"
              >
                {t.NewConnectionForm["Reload schema"]}
              </Btn>
            )}
          </FlexRow>
          <SwitchToggle
            id="realtime"
            label={{
              label: t.NewConnectionForm.Realtime,
              info: t.NewConnectionForm[
                "Needed to allow realtime data view. Requires superuser"
              ],
            }}
            data-command="NewConnectionForm.realtime"
            checked={!c.disable_realtime}
            onChange={(disable_realtime) => {
              updateConnection({ disable_realtime: !disable_realtime });
            }}
          />
          {!c.disable_realtime && (
            <InfoRow>
              {
                t.NewConnectionForm[
                  "Realtime requires table triggers to be created as and when needed."
                ]
              }
              <br></br>
              {
                t.NewConnectionForm[
                  'A "prostgles" schema with necessary metadata will also be created'
                ]
              }
            </InfoRow>
          )}
        </>
      )}
    </>
  );
};
