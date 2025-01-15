import React, { useState } from "react";
import PopupMenu from "../../components/PopupMenu";
import Btn from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import type { Prgl } from "../../App";
import { InfoRow } from "../../components/InfoRow";
import { Success } from "../../components/Animations";
import { t } from "../../i18n/i18nUtils";

export const ChangePassword = ({ dbsMethods }: Pick<Prgl, "dbsMethods">) => {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const issue =
    !password ? t.ChangePassword["Enter your old password"]
    : !newPassword ? t.ChangePassword["Enter your new password"]
    : !confirmPassword ? t.ChangePassword["Confirm your new password"]
    : newPassword !== confirmPassword ?
      t.ChangePassword["Passwords do not match"]
    : undefined;
  const [success, setSuccess] = useState(false);
  return (
    <PopupMenu
      title={t.ChangePassword["Change password"]}
      positioning="center"
      button={
        <Btn color="action" variant="filled">
          {t.ChangePassword["Change password"]}
        </Btn>
      }
      contentClassName="flex-col p-1 gap-1"
      clickCatchStyle={{ opacity: 0.5 }}
      render={(pClose) => {
        if (success) return <Success />;
        return (
          <>
            <FormField
              label={t.ChangePassword["Old password"]}
              type="password"
              value={password}
              onChange={setPassword}
            />
            <FormField
              label={t.ChangePassword["New password"]}
              autoComplete="new-password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <FormField
              label={t.ChangePassword["Confirm new password"]}
              autoComplete="new-password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <InfoRow variant="naked" className="mt-1" iconPath="">
              {
                t.ChangePassword[
                  "Make sure it's at least 15 characters OR at least 8 characters including a number and a lowercase letter"
                ]
              }
            </InfoRow>
          </>
        );
      }}
      footerButtons={(pClose) => [
        {
          label: t.common.Cancel,
          onClickClose: true,
        },
        {
          label: t.ChangePassword["Change password"],
          color: "action",
          variant: "filled",
          disabledInfo: issue,
          onClickPromise: async (e) => {
            await dbsMethods.changePassword!(password, newPassword);
            setSuccess(true);
            setTimeout(() => {
              pClose!(e);
              setPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setSuccess(false);
            }, 2000);
          },
        },
      ]}
    />
  );
};
