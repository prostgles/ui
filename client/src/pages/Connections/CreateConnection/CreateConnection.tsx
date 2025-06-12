import { mdiPlus } from "@mdi/js";
import React, { useState } from "react";
import ErrorComponent from "../../../components/ErrorComponent";
import { FlexCol } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import { FormFieldDebounced } from "../../../components/FormField/FormFieldDebounced";
import Popup from "../../../components/Popup/Popup";
import Select from "../../../components/Select/Select";
import type { DBS, DBSMethods } from "../../../dashboard/Dashboard/DBS";
import { SampleSchemas } from "../../../dashboard/SampleSchemas";
import { t } from "../../../i18n/i18nUtils";
import { CreatePostgresUser } from "../CreatePostgresUser";
import type { IConnection } from "../useConnections";
import {
  useCreateConnection,
  type CreateConnectionType,
} from "./useCreateConnection";

export type CreateConnectionProps = Required<
  Pick<
    DBSMethods,
    | "runConnectionQuery"
    | "getSampleSchemas"
    | "createConnection"
    | "validateConnection"
    | "getSampleSchemas"
  >
> & {
  connId: string;
  dbs: DBS;
  connections: IConnection[];
  showCreateText: boolean;
  connectionGroupKey: string;
};

export const CreateConnection = (props: CreateConnectionProps) => {
  const { showCreateText, getSampleSchemas, connectionGroupKey } = props;
  const {
    error,
    onCreateConnection,
    serverInfo,
    onOpenActions,
    connectionName,
    setConnectionName,
    setError,
    newUser,
  } = useCreateConnection(props);
  const { newUserPasswordError, newUsernameError } = newUser;
  const cannotCreateDb =
    error?.toString() || (serverInfo && !serverInfo.canCreateDb);

  const [action, setAction] = useState<CreateConnectionType[number]>();
  const duplicateDbName =
    action?.type === "new" &&
    serverInfo?.databases.includes(action.newDatabaseName!);

  const duplicateConnectionName =
    serverInfo?.existingConnectionNames.includes(connectionName);
  const ConnectionNameEditor = (
    <FormField
      label={"New connection name"}
      value={connectionName}
      onChange={setConnectionName}
      error={duplicateConnectionName ? "Name already in used" : undefined}
    />
  );
  return (
    <>
      <Select
        title={t.ConnectionServer["Add or create a database"]}
        btnProps={{
          iconPath: mdiPlus,
          children:
            showCreateText ? t.ConnectionServer["Create a database"] : "",
          size: "small",
          color: "action",
          variant: "filled",
          "data-command": "ConnectionServer.add",
          "data-key": connectionGroupKey,
        }}
        fullOptions={[
          {
            key: "new",
            label: t.ConnectionServer["Create a database in this server"],
            /** This is to ensure serverInfo is loaded before clicking  */
            "data-command":
              !serverInfo || cannotCreateDb ? undefined : (
                "ConnectionServer.add.newDatabase"
              ),
            disabledInfo:
              error?.toString() ??
              (cannotCreateDb ?
                t.ConnectionServer[
                  "Not allowed to create databases with this user"
                ]({ rolname: serverInfo?.rolname ?? "" })
              : undefined),
          },
          {
            key: "existing",
            label: t.ConnectionServer["Select a database from this server"],
            disabledInfo: error?.toString(),
          },
        ]}
        onOpen={onOpenActions}
        onChange={(action) => {
          setAction({ type: action });
        }}
      />
      {!!action && (
        <Popup
          clickCatchStyle={{ opacity: 1 }}
          positioning="center"
          title={action.type}
          onClose={() => setAction(undefined)}
          autoFocusFirst={{ selector: "input" }}
          footerButtons={[
            { label: "Cancel", onClickClose: true },
            {
              label:
                action.type === "existing" ?
                  t.ConnectionServer["Save and connect"]
                : t.ConnectionServer["Create and connect"],
              variant: "filled",
              color: "action",
              "data-command": "ConnectionServer.add.confirm",
              disabledInfo:
                (
                  (action.type === "new" &&
                    !action.newDatabaseName &&
                    !connectionName) ||
                  (action.type === "existing" &&
                    !action.existingDatabaseName &&
                    !connectionName)
                ) ?
                  t.ConnectionServer["Some data is missing"]
                : duplicateConnectionName ?
                  t.ConnectionServer["Must fix connection name error"]
                : (newUsernameError ?? newUserPasswordError ?? undefined),
              onClickMessage: async (e, setMsg) => {
                setMsg({ loading: 1, delay: 0 });
                try {
                  await onCreateConnection(action);
                } catch (error) {
                  console.error(error);
                  setError(error);
                }
                setMsg({ loading: 0 });
              },
            },
          ]}
          contentClassName="flex-col gap-1 p-1 mx-p25"
        >
          {action.type === "new" ?
            <>
              <FormFieldDebounced
                label={t.ConnectionServer["New database name"]}
                data-command="ConnectionServer.NewDbName"
                inputProps={{ autoFocus: true }}
                error={
                  duplicateDbName ?
                    t.ConnectionServer["Name already in use"]
                  : undefined
                }
                onChange={(newDatabaseName) => {
                  setAction({ ...action, newDatabaseName });
                  setConnectionName(newDatabaseName);
                }}
                value={action.newDatabaseName}
              />
              {!action.newDatabaseName && (
                <FlexCol>
                  <div>Or</div>
                  <SampleSchemas
                    title={t.ConnectionServer["Create demo schema (optional)"]}
                    name={action.applySchema?.name}
                    dbsMethods={{ getSampleSchemas }}
                    onChange={(applySchema) => {
                      const newDatabaseName = applySchema.name.split(".")[0]!;
                      setConnectionName(newDatabaseName);
                      setAction({
                        ...action,
                        newDatabaseName,
                        applySchema,
                      });
                    }}
                  />
                </FlexCol>
              )}
              {!!action.newDatabaseName && (
                <>
                  {ConnectionNameEditor}
                  <SampleSchemas
                    title={t.ConnectionServer["Create demo schema (optional)"]}
                    name={action.applySchema?.name}
                    dbsMethods={{ getSampleSchemas }}
                    onChange={(applySchema) => {
                      setAction({
                        ...action,
                        applySchema,
                      });
                    }}
                  />
                </>
              )}
            </>
          : serverInfo ?
            <>
              <Select
                label={t.ConnectionServer["Database"]}
                value={action.existingDatabaseName}
                data-command="ConnectionServer.add.existingDatabase"
                fullOptions={serverInfo.databases
                  .map((key) => ({
                    key,
                    subLabel:
                      serverInfo.usedDatabases.includes(key) ?
                        t.ConnectionServer["Already added to connections"]
                      : undefined,
                  }))
                  .sort((a, b) => +!!a.subLabel - +!!b.subLabel)}
                onChange={(existingDatabaseName) => {
                  setAction({
                    ...action,
                    existingDatabaseName,
                  });
                  if (!connectionName) {
                    setConnectionName(existingDatabaseName);
                  }
                }}
              />
              {action.existingDatabaseName && ConnectionNameEditor}
            </>
          : t.common["Something went wrong"]}
          {(action.type === "new" ?
            action.newDatabaseName
          : action.existingDatabaseName) && (
            <CreatePostgresUser {...newUser} connectionName={connectionName} />
          )}
          <ErrorComponent error={error} />
        </Popup>
      )}
    </>
  );
};
