import React, { useState } from "react";
import type { ClientUser, ExtraProps } from "../../App";
import Btn from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import PopupMenu from "../../components/PopupMenu";
import { pageReload } from "../../components/Loading";

export const PasswordlessSetup = ({ dbsMethods }: ExtraProps) => {
  type NewUser = Partial<ClientUser & { passwordconfirm?: string }>;
  const [{ username, password, passwordconfirm }, setNewUser] =
    useState<NewUser>({});

  const setU = (u: NewUser) => {
    setNewUser((user) => ({ ...user, ...u }));
  };
  const issues =
    !username ? "Username not provided"
    : !password ? "Password not provided"
    : !passwordconfirm ? "Password confirmation not provided"
    : password !== passwordconfirm ? "Passwords do not match"
    : undefined;

  return (
    <div className="flex-col gap-1 ai-center p-1">
      <div>Passwordless access</div>
      <div>Only this device and browser can access the dashboard</div>
      <div>
        To add users and set access control must first create an admin user with
        a password. This will disable passwordless access
      </div>

      <PopupMenu
        title="Create admin user"
        positioning="top-center"
        button={
          <Btn color="action" variant="filled">
            Create admin user
          </Btn>
        }
        render={(pClose) => (
          <div className="flex-col gap-1">
            <FormField
              id="username"
              label="Username"
              value={username ?? ""}
              onChange={(username) => setU({ username })}
            />
            <FormField
              id="new-password"
              autoComplete="off"
              label="Password"
              type="password"
              value={password ?? ""}
              onChange={(password) => setU({ password })}
            />
            <FormField
              id="confirm_password"
              autoComplete="false"
              label="Confirm password"
              type="password"
              value={passwordconfirm ?? ""}
              onChange={(passwordconfirm) => setU({ passwordconfirm })}
            />
          </div>
        )}
        footerButtons={[
          {
            label: "Create",
            disabledInfo: issues,
            variant: "filled",
            color: "action",
            onClickPromise: async () => {
              if (!username || !password) {
                throw "Username or Password missing";
              }
              await dbsMethods.disablePasswordless!({ username, password });
              pageReload("disablePasswordless");
            },
          },
        ]}
      />
    </div>
  );
};
