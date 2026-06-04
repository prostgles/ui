import Btn from "@components/Btn";
import ButtonGroup from "@components/ButtonGroup";
import ErrorComponent from "@components/ErrorComponent";
import FormField from "@components/FormField/FormField";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import { mdiConnection, mdiPlus } from "@mdi/js";
import { usePromise, type SQLHandler } from "prostgles-client";
import React, { useEffect, useRef } from "react";
import type { Prgl } from "src/App";
import CodeExample from "../../dashboard/CodeExample";
import { t } from "../../i18n/i18nUtils";
import type { FullExtraProps } from "../ProjectConnection/ProjectConnection";
import type { Connection } from "./NewConnectionForm";
import { NewConnectionFormOptions } from "./NewConnectionFormOptions";
import { getDBCloneQuery } from "./newConnectionUtils";

type DBProps = {
  origCon: Partial<Connection>;
  dbProject: Prgl["db"];
  sql: SQLHandler | undefined;
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

  const { dbProject, origCon, sql } = dbProps ?? {};

  const { type } = c;

  const suggestions = usePromise(async () => {
    if (!sql) return {};

    try {
      const databases = (await sql(
        `
      SELECT datname
      FROM pg_catalog.pg_database
      `,
        {},
        { returnType: "values" },
      )) as string[];

      const users = (await sql(
        `
        SELECT rolname, rolsuper
        FROM pg_catalog.pg_roles`,
        {},
        { returnType: "rows" },
      )) as {
        rolname: string;
        rolsuper: boolean;
      }[];

      const schemas = (await sql(
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
  }, [sql]);

  return (
    <>
      {!isForStateDB && (
        <FormField
          data-command="NewConnectionForm.connectionName"
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

      <ButtonGroup
        label={{
          label: t.NewConnectionForm["Connection type"],
          variant: "normal",
        }}
        data-command="NewConnectionForm.connectionType"
        value={type}
        options={["Standard", "Connection URI"]}
        onChange={(type) => {
          updateConnection({ type });
        }}
      />

      {type === "Connection URI" ?
        <>
          <FormFieldDebounced
            label={t.NewConnectionForm["Connection URI"]}
            data-command="NewConnectionForm.db_conn"
            type="text"
            hint="postgres://user:pass@host:port/database?sslmode=require"
            required={true}
            value={c.db_conn || ""}
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
            data-command="NewConnectionForm.db_host"
            type="text"
            autoComplete="off"
            onChange={(db_host) => updateConnection({ db_host })}
          />
          <FormField
            id="p"
            value={c.db_port}
            label={t.NewConnectionForm["Port"]}
            data-command="NewConnectionForm.db_port"
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
            data-command="NewConnectionForm.db_user"
            label={t.NewConnectionForm["User"]}
            type="text"
            autoComplete="off"
            onChange={(db_user) => updateConnection({ db_user })}
          />
          <FormField
            id="pass"
            value={c.db_pass ?? ""}
            label={t.NewConnectionForm["Password"]}
            data-command="NewConnectionForm.db_pass"
            type="text"
            autoComplete="off"
            onChange={(db_pass) => updateConnection({ db_pass })}
          />

          <FormField
            id="d"
            value={c.db_name}
            label={t.NewConnectionForm.Database}
            data-command="NewConnectionForm.db_name"
            type="text"
            options={suggestions?.databases}
            autoComplete="off"
            onChange={(db_name) => {
              void updateConnection({ db_name });
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
                  initialState={{ query: "", action: "create" }}
                  render={(pClose, { query, action }, setState) => {
                    if (action === "clone" && origCon?.db_name) {
                      getDBCloneQuery(origCon.db_name, c.db_name, sql!).then(
                        (newQuery) => {
                          if (newQuery !== query) setState({ query: newQuery });
                        },
                      );
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
                          onClickPromise={() => sql!(query).then(pClose)}
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

      <NewConnectionFormOptions
        c={c}
        dbProps={dbProps}
        updateConnection={updateConnection}
        isForStateDB={isForStateDB}
      />
      <div className="flex-col my-1 gap-1">
        {test.onTest && (
          <Btn
            variant="faded"
            data-command="NewConnectionForm.testConnection"
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
            className={"chip flex-col p-1 " + (test.statusOK ? "green" : "red")}
          >
            <span className="ws-pre">{test.status}</span>
          </div>
        )}
      </div>
    </>
  );
};
