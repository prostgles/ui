import { mdiSync } from "@mdi/js";
import { usePromise } from "prostgles-client";
import React, { useCallback, useState } from "react";
import type { Prgl } from "../../App";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { SwitchToggle } from "@components/SwitchToggle";
import { getSqlSuggestions } from "../SQLEditor/SQLEditorSuggestions";
import { SQLSmartEditor } from "../SQLEditor/SQLSmartEditor";
import {
  getUserSyncColumnDefinitions,
  USER_SYNC_REQUIRED_COLUMNS,
} from "@common/userSync";

export const UserSyncConfig = ({
  databaseId,
  dbs,
  dbsTables,
  tables,
  sql,
  dbKey,
  connectionId,
}: Prgl) => {
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({
    id: databaseId,
  });
  const dbsTable = dbsTables.find((t) => t.name === "users");
  const getState = useCallback(() => {
    const table = tables.find((t) => t.name === "users");
    if (!dbsTable)
      return {
        err: "no-dbs-users-table" as const,
      };
    const createColStatements = getUserSyncColumnDefinitions(dbsTable.columns);
    const createUsersTableQuery = `CREATE TABLE users (\n${createColStatements.map((c) => `  ${c}`).join(",\n")}\n);`;
    if (!table) {
      return {
        err: "no-users-table" as const,
        query: createUsersTableQuery,
      };
    }
    const missingColumns = dbsTable.columns.filter(
      (c) =>
        USER_SYNC_REQUIRED_COLUMNS.some((name) => name === c.name) &&
        !table.columns.find(
          (tc) => tc.name === c.name && tc.udt_name === c.udt_name,
        ),
    );
    const passwordRequiresValue = table.columns.some(
      (column) =>
        column.name === "password" &&
        !column.is_nullable &&
        column.column_default == null,
    );
    if (missingColumns.length || passwordRequiresValue) {
      const alterations = getUserSyncColumnDefinitions(missingColumns).map(
        (definition) => `\nADD COLUMN ${definition}`,
      );
      if (passwordRequiresValue) {
        alterations.push('\nALTER COLUMN "password" DROP NOT NULL');
      }
      return {
        err: "missing-cols" as const,
        query: `ALTER TABLE users ${alterations.join(",")};\n\n/* Syncable users fields:\n${createUsersTableQuery}\n*/`,
      };
    }

    return { err: "none" as const };
  }, [tables, dbsTable]);

  const suggestions = usePromise(async () => {
    const suggestions = await getSqlSuggestions(sql!);
    return suggestions;
  }, [sql]);
  const [localState, setLocalState] = useState<ReturnType<typeof getState>>();

  if (localState?.err === "no-dbs-users-table") {
    return <ErrorComponent error={"Unexpected: no dbs users table"} />;
  }

  let sqlEditor: React.ReactNode = null;
  if (localState?.query && suggestions) {
    const title =
      localState.err === "no-users-table" ?
        "Must create the users table"
      : "Must update the users table";
    sqlEditor = (
      <SQLSmartEditor
        asPopup={false}
        key={localState.query}
        sql={sql!}
        query={localState.query}
        title={title}
        contentTop={<p className="ta-left m-0 p-0">{title}</p>}
        suggestions={{ dbKey, connectionId, onRenew: () => {}, ...suggestions }}
        onSuccess={() => {
          setLocalState(undefined);
          void dbs.database_configs.update(
            { id: databaseId },
            { sync_users: true },
          );
        }}
        onCancel={() => {
          setLocalState(undefined);
        }}
      />
    );
  }

  return (
    <PopupMenu
      title="Sync users"
      positioning="beneath-center"
      button={
        <Btn
          iconPath={mdiSync}
          color={dbConf?.sync_users ? "action" : undefined}
          variant={"faded"}
        >
          Sync users...
        </Btn>
      }
      clickCatchStyle={{ opacity: 1 }}
      render={(pClose) => (
        <FlexCol>
          <p className="ta-start">
            When enabled, all users with access rights to this database will be
            upserted from the state database to the "users" table from this
            database.
            <br></br>
            Only columns that match the "users" table columns by name and data
            type will be upserted. Authentication secrets are excluded. Users
            who are deleted or lose access are retained with status "disabled".
          </p>
          <SwitchToggle
            checked={dbConf?.sync_users ?? false}
            label="Sync users"
            onChange={(sync_users) => {
              const doUpdate = () =>
                dbs.database_configs.update({ id: databaseId }, { sync_users });
              if (!sync_users) {
                doUpdate();
                return;
              }
              const state = getState();
              if (state.err !== "none") {
                setLocalState(state);
                return;
              }
              doUpdate();
            }}
          />
          {sqlEditor}
        </FlexCol>
      )}
      footerButtons={[{ label: "Close", onClickClose: true, variant: "faded" }]}
    />
  );
};
