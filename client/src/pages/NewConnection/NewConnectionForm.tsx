import { mdiConnection, mdiDotsHorizontal, mdiPlus } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import type { SQLHandler } from "prostgles-types";
import React, { useEffect, useRef } from "react";
import Btn from "../../components/Btn";
import ButtonGroup from "../../components/ButtonGroup";
import { ExpandSection } from "../../components/ExpandSection";
import { FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import { SwitchToggle } from "../../components/SwitchToggle";
import CodeExample from "../../dashboard/CodeExample";
import type { Connection } from "./NewConnnection";
import type { FullExtraProps } from "../ProjectConnection/ProjectConnection";
import ErrorComponent from "../../components/ErrorComponent";
import { t } from "../../i18n/i18nUtils";

const SSL_MODES = [
  { key: "disable", subLabel: "only try a non-SSL connection" },
  {
    key: "allow",
    subLabel:
      "first try a non-SSL connection; if that fails, try an SSL connection",
  },
  {
    key: "prefer",
    subLabel:
      "(Default) first try an SSL connection; if that fails, try a non-SSL connection",
  },
  {
    key: "require",
    subLabel:
      "only try an SSL connection. If a root CA file is present, verify the certificate in the same way as if verify-ca was specified",
  },
  {
    key: "verify-ca",
    subLabel:
      "only try an SSL connection, and verify that the server certificate is issued by a trusted certificate authority (CA)",
  },
  {
    key: "verify-full",
    subLabel:
      "only try an SSL connection, verify that the server certificate is issued by a trusted CA and that the requested server host name matches that in the certificate",
  },
] as const;

type DBProps = {
  origCon: Partial<Connection>;
  dbProject: FullExtraProps["dbProject"];
  dbsTables: FullExtraProps["dbsTables"];
  dbsMethods: FullExtraProps["dbsMethods"];
};

export type NewConnectionFormProps = {
  c: Connection;
  nameErr?: string;
  updateConnection: (con: Partial<Connection>) => Promise<void>;
  warning?: any;
  mode: "clone" | "edit" | "insert";
  isForStateDB?: boolean;

  test: {
    onTest?: () => Promise<void>;
    status: string;
    statusOK: boolean;
  };

  dbProps: DBProps | undefined;
};

export const NewConnectionForm = ({
  c,
  updateConnection,
  nameErr,
  warning,
  test,
  mode,
  isForStateDB,
  dbProps,
}: NewConnectionFormProps) => {
  const refStatus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    refStatus.current?.scrollIntoView();
  }, [test.status]);
  const sslmode = "db_ssl" in c ? c.db_ssl || "disable" : "disabled";

  const { dbsTables, dbProject, origCon, dbsMethods } = dbProps ?? {};

  const cTable = dbsTables?.find((t) => t.name === "connections");

  const { type } = c;

  const suggestions = usePromise(async () => {
    if (!dbProject?.sql) return {};

    try {
      const databases = (await dbProject.sql(
        `
      SELECT datname
      FROM pg_catalog.pg_database
      `,
        {},
        { returnType: "values" },
      )) as string[];

      const users = (await dbProject.sql(
        `
        SELECT rolname, rolsuper
        FROM pg_catalog.pg_roles`,
        {},
        { returnType: "rows" },
      )) as {
        rolname: string;
        rolsuper: boolean;
      }[];

      const schemas = (await dbProject.sql(
        `
        SELECT schema_name, schema_owner
        FROM information_schema.schemata
        ORDER BY (
          CASE WHEN schema_name = 'public' THEN '0' 
            WHEN schema_owner = 'postgres' THEN 'b' 
            ELSE 'a' 
          END
        ) || schema_name
        `,
        {},
        { returnType: "rows" },
      )) as { schema_name: string; schema_owner: string }[];

      return { users, databases, schemas };
    } catch (e) {
      console.error("Failed getting user & db suggestions", e);
    }
  }, [dbProject]);

  return (
    <>
      {!isForStateDB && (
        <FormField
          label={t.NewConnectionForm["Connection name"]}
          hint={t.NewConnectionForm.Optional}
          type="text"
          error={nameErr}
          value={c.name}
          onChange={(name: string) => {
            updateConnection({ name });
          }}
        />
      )}

      <div className="flex-col gap-p5 ta-left">
        <label className="m-0 text-1 ">
          {t.NewConnectionForm["Connection type"]}
        </label>
        <ButtonGroup
          value={type}
          options={["Standard", "Connection URI"]}
          onChange={(type) => {
            updateConnection({ type });
          }}
        />
      </div>

      {type === "Prostgles" ?
        <>
          <FormField
            label={t.NewConnectionForm["Socket URL"]}
            type="url"
            required={true}
            value={c.prgl_url}
            onChange={(val: string) => {
              updateConnection({ prgl_url: val });
            }}
          />
          <FormField
            label={t.NewConnectionForm["Socket params (JSON)"]}
            type="text"
            required={true}
            value={c.prgl_params}
            onChange={(val: string) => {
              updateConnection({ prgl_params: val });
            }}
            hint={`{ "path": "/socket" } `}
          />
        </>
      : type === "Connection URI" ?
        <>
          <FormFieldDebounced
            label={t.NewConnectionForm["Connection URI"]}
            type="text"
            hint="postgres://user:pass@host:port/database?sslmode=require"
            required={true}
            value={c.db_conn}
            onChange={(db_conn: string) => {
              updateConnection({ db_conn });
            }}
          />
        </>
      : <>
          <FormField
            id="h"
            value={c.db_host}
            label={t.NewConnectionForm["Host"]}
            type="text"
            autoComplete="off"
            onChange={(db_host) => updateConnection({ db_host })}
          />
          <FormField
            id="p"
            value={c.db_port}
            label={t.NewConnectionForm["Port"]}
            type="number"
            autoComplete="off"
            onChange={(db_port) => updateConnection({ db_port })}
          />
          <FormField
            id="u"
            value={c.db_user}
            fullOptions={suggestions?.users?.map(({ rolname, rolsuper }) => ({
              key: rolname,
              subLabel: rolsuper ? "Superuser" : "",
            }))}
            label={t.NewConnectionForm["User"]}
            type="text"
            autoComplete="off"
            onChange={(db_user) => updateConnection({ db_user })}
          />
          <FormField
            id="pass"
            value={c.db_pass}
            label={t.NewConnectionForm["Password"]}
            type="text"
            autoComplete="off"
            onChange={(db_pass) => updateConnection({ db_pass })}
          />

          <FormField
            id="d"
            value={c.db_name}
            label={t.NewConnectionForm.Database}
            type="text"
            options={suggestions?.databases}
            autoComplete="off"
            onChange={(db_name) => {
              updateConnection({ db_name });
            }}
            rightContentAlwaysShow={true}
            rightIcons={
              mode === "edit" &&
              c.db_name &&
              dbProject?.sql && (
                <PopupMenu
                  title={t.NewConnectionForm["Create database"]}
                  positioning={undefined}
                  clickCatchStyle={{ opacity: 0.5 }}
                  button={
                    <Btn
                      iconPath={mdiPlus}
                      title={t.NewConnectionForm["Create database"]}
                    ></Btn>
                  }
                  initialState={
                    { query: "", action: "create" } as {
                      query: string;
                      action: "create" | "clone";
                    }
                  }
                  render={(pClose, { query, action }, setState) => {
                    if (action === "clone" && origCon?.db_name) {
                      getDBCloneQuery(
                        origCon.db_name,
                        c.db_name!,
                        dbProject.sql!,
                      ).then((newQuery) => {
                        if (newQuery !== query) setState({ query: newQuery });
                      });
                    } else {
                      const newQuery = `CREATE DATABASE ${c.db_name}; `;
                      if (newQuery !== query) setState({ query: newQuery });
                    }

                    return (
                      <div className="flex-col gap-1">
                        <ButtonGroup
                          value={action}
                          options={["create", "clone"]}
                          onChange={(action) => setState({ action })}
                        />
                        {action === "clone" && (
                          <InfoRow>
                            {t.NewConnectionForm[
                              "You are about to clone the current database"
                            ]({
                              currDb: origCon?.db_name ?? "",
                              newDb: c.db_name,
                            })}
                          </InfoRow>
                        )}
                        {action === "create" && (
                          <InfoRow color="action">
                            {
                              t.NewConnectionForm[
                                "You are about to create a new database"
                              ]
                            }
                            : {c.db_name}
                          </InfoRow>
                        )}
                        <CodeExample
                          value={query}
                          language="sql"
                          style={{ minHeight: "400px" }}
                        />
                        <Btn
                          variant="filled"
                          color="action"
                          onClickPromise={() =>
                            dbProject.sql!(query).then(pClose)
                          }
                        >
                          {t.common.Run}
                        </Btn>
                      </div>
                    );
                  }}
                />
              )
            }
          />
        </>
      }

      {warning && <ErrorComponent error={warning} style={{ minWidth: 0 }} />}

      {type !== "Prostgles" && (
        <>
          <ExpandSection
            label={t.NewConnectionForm["More options"]}
            buttonProps={{
              variant: undefined,
              color: "action",
              iconPath: mdiDotsHorizontal,
              "data-command": "MoreOptionsToggle",
            }}
          >
            <FormField
              id="schema_filter"
              label={t.NewConnectionForm["Schema list"]}
              optional={true}
              multiSelect={true}
              data-command="SchemaFilter"
              fullOptions={
                suggestions?.schemas?.map((s) => ({
                  key: s.schema_name,
                  subLabel: s.schema_owner,
                })) ?? []
              }
              value={Object.keys(c.db_schema_filter || { public: 1 })}
              disabledInfo={
                !suggestions?.schemas ?
                  t.NewConnectionForm["Must connect to see schemas"]
                : undefined
              }
              onChange={(schema_keys) => {
                updateConnection({
                  type: "Standard",
                  db_schema_filter: schema_keys.reduce(
                    (acc, key) => ({
                      ...acc,
                      [key]:
                        (
                          Object.values(
                            c.db_schema_filter || { a: 1 },
                          ).includes(1)
                        ) ?
                          1
                        : 0,
                    }),
                    {},
                  ),
                });
              }}
            />
            <FormField
              id="timeout"
              label={t.NewConnectionForm["Connection timeout (ms)"]}
              optional={true}
              value={c.db_connection_timeout}
              onChange={(db_connection_timeout) => {
                updateConnection({ db_connection_timeout, type: "Standard" });
              }}
            />
            <FormField
              id="ssl_mode"
              label={t.NewConnectionForm["SSL Mode"]}
              fullOptions={SSL_MODES}
              required={true}
              value={c.db_ssl}
              onChange={async (db_ssl: (typeof SSL_MODES)[number]["key"]) => {
                // if(c.type === "Connection URI"){
                //   const con = await dbsMethods?.validateConnection?.({ ...c, db_ssl, type: "Standard" });
                //   console.log(con);
                // }
                /** Switch to standard to ensure the db_conn is updated accordingly */
                updateConnection({ db_ssl, type: "Standard" });
              }}
            />
            {[
              "verify-ca",
              "verify-full",
              "require",
              "prefer",
              "allow",
            ].includes(sslmode!) && (
              <>
                <FormField
                  id="ssl_cert"
                  label={t.NewConnectionForm["CA Certificate"]}
                  type="file"
                  labelStyle={{ flex: "unset" }}
                  onChange={async (files) => {
                    const file: File | null = files[0];
                    updateConnection({
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
                    const file: File | null = files[0];
                    updateConnection({
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
                    const file: File | null = files[0];
                    updateConnection({
                      ssl_client_certificate_key:
                        (await file?.text()) ?? undefined,
                    });
                  }}
                />
                <FormField
                  id="ssl_rejectUnauthorized"
                  label={t.NewConnectionForm["Reject unauthorized"]}
                  type="checkbox"
                  labelStyle={{ flex: "unset" }}
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
                  checked={!!c.db_watch_shema}
                  onChange={(db_watch_shema) => {
                    updateConnection({ db_watch_shema });
                  }}
                />
                {dbsMethods?.reloadSchema && (
                  <Btn
                    onClickPromise={() => dbsMethods.reloadSchema!(c.id!)}
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
          <div className="flex-col my-1 gap-1">
            {test.onTest && (
              <Btn
                variant="faded"
                color="default"
                iconPath={mdiConnection}
                onClickPromise={test.onTest}
              >
                {t.NewConnectionForm["Test connection"]}
              </Btn>
            )}

            {!!test.status && (
              <div
                ref={refStatus}
                style={{ padding: "1em", borderRadius: "8px" }}
                className={
                  "chip flex-col p-1 " + (test.statusOK ? "green" : "red")
                }
              >
                <span className="ws-pre">{test.status}</span>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

const getDBCloneQuery = (
  oldDb: string,
  newDb: string,
  sql: SQLHandler,
): Promise<string> => {
  return sql(
    "/* originaldb must be idle/not accessed by other users */ \n \
  CREATE DATABASE ${newDb} WITH TEMPLATE ${oldDb} OWNER current_user; \n \
  \n \
  /* To make originaldb idle */ \n  \
  SELECT pg_terminate_backend(pg_stat_activity.pid)   \n  \
  FROM pg_stat_activity  \n  \
  WHERE pg_stat_activity.datname = ${newDb}   \n  \
  AND pid <> pg_backend_pid(); \n  \
  ",
    { oldDb, newDb },
    { returnType: "statement" },
  );
};
