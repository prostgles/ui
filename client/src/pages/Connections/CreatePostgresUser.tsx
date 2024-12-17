import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useState } from "react";
import ButtonGroup from "../../components/ButtonGroup";
import Checkbox from "../../components/Checkbox";
import { FlexRowWrap } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import { SwitchToggle } from "../../components/SwitchToggle";
import type { DBSMethods } from "../../dashboard/Dashboard/DBS";

export type NewPostgresUser = {
  name: string;
  password: string;
  create: boolean;
  permissions:
    | {
        type: "owner";
      }
    | {
        type: "custom";
        allow_subscription_triggers: boolean;
        select: boolean;
        insert: boolean;
        update: boolean;
        delete: boolean;
      };
};

type P = {
  connectionName: string;
  newPgUser: NewPostgresUser;
  setNewPgUser: (newOwner: NewPostgresUser) => void;
  newUsernameError: string | undefined;
  newUserPasswordError: string | undefined;
};

const PermissionTypes = [
  { key: "owner", label: "Owner" },
  { key: "custom", label: "Custom" },
] as const;

const CustomPermissions = [
  { key: "select", label: "Select" },
  { key: "update", label: "Update" },
  { key: "insert", label: "Insert" },
  { key: "delete", label: "Delete" },
] as const;

export const CreatePostgresUser = ({
  newPgUser,
  setNewPgUser,
  connectionName,
  newUserPasswordError,
  newUsernameError,
}: P) => {
  return (
    <>
      <SwitchToggle
        label="Create a user for this database (optional)"
        variant="col"
        data-command="ConnectionServer.withNewOwnerToggle"
        checked={newPgUser.create}
        onChange={(create) => {
          setNewPgUser({
            ...newPgUser,
            ...(create &&
              !newPgUser.name &&
              connectionName && { name: `${connectionName}_owner` }),
            create,
          });
        }}
      />
      {newPgUser.create && (
        <>
          <FormFieldDebounced
            data-command="ConnectionServer.NewUserName"
            label={"New username"}
            value={newPgUser.name}
            error={newUsernameError}
            onChange={(name) => setNewPgUser({ ...newPgUser, name })}
          />
          <FormField
            data-command="ConnectionServer.NewUserPassword"
            label={"New username password"}
            value={newPgUser.password}
            error={newUserPasswordError}
            onChange={(password) => setNewPgUser({ ...newPgUser, password })}
          />
          <ButtonGroup
            fullOptions={PermissionTypes}
            value={newPgUser.permissions.type}
            label={"Permission type"}
            onChange={(type) => {
              setNewPgUser({
                ...newPgUser,
                permissions:
                  type === "owner" ?
                    { type }
                  : {
                      type,
                      select: true,
                      insert: true,
                      update: true,
                      delete: true,
                      allow_subscription_triggers: false,
                    },
              });
            }}
          />
          {newPgUser.permissions.type === "custom" && (
            <>
              <div>
                Ticked commands will be allowed on all tables in the public
                schema
              </div>
              <FlexRowWrap>
                {CustomPermissions.map((p) => (
                  <Checkbox
                    key={p.key}
                    label={p.label}
                    checked={newPgUser.permissions[p.key]}
                    onChange={(e) =>
                      setNewPgUser({
                        ...newPgUser,
                        permissions: {
                          ...newPgUser.permissions,
                          [p.key]: e.target.checked,
                        },
                      })
                    }
                  />
                ))}
              </FlexRowWrap>
              <SwitchToggle
                label={{
                  label: "Allow subscribing to tables",
                  info: "This will allow adding triggers to tables from the public schema and select/update/delete/insert access to tables from the prostgles schema",
                }}
                checked={newPgUser.permissions.allow_subscription_triggers}
                onChange={(allow_subscription_triggers) => {
                  if (newPgUser.permissions.type !== "custom") return;
                  setNewPgUser({
                    ...newPgUser,
                    permissions: {
                      ...newPgUser.permissions,
                      allow_subscription_triggers,
                    },
                  });
                }}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

type Args = {
  connId: string;
  runConnectionQuery: DBSMethods["runConnectionQuery"];
};
export const useCreatePostgresUser = ({ connId, runConnectionQuery }: Args) => {
  const [newPgUser, setNewPgUser] = useState<
    NewPostgresUser & { create: boolean }
  >({
    name: "",
    password: "",
    create: false,
    permissions: {
      type: "owner",
    },
  });
  const newUserName = newPgUser.name;
  const newUsernameError = usePromise(async () => {
    if (!connId || !runConnectionQuery || !newUserName || !newPgUser.create)
      return undefined;
    if (!newUserName) return "Username is required";
    const matchingUserNames = await runConnectionQuery(
      connId,
      `SELECT usename FROM pg_catalog.pg_user WHERE usename = $1`,
      [newUserName],
    );
    return matchingUserNames.length > 0 ? "User already exists" : undefined;
  }, [newUserName, connId, runConnectionQuery, newPgUser.create]);
  const newUserPasswordError =
    newPgUser.create && !newPgUser.password ?
      "Password is required"
    : undefined;

  return { newPgUser, setNewPgUser, newUsernameError, newUserPasswordError };
};
