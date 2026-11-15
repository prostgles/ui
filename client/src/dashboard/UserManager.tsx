import { canManageBusinessAccess } from "@common/authTypesAndConstants";
import React from "react";

import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { t } from "../i18n/i18nUtils";
import { PasswordlessSetup } from "./AccessControl/PasswordlessSetup";
import { SmartCardList } from "./SmartCardList/SmartCardList";

export type Users = {
  created?: Date;
  id?: string;
  last_updated?: number;
  password?: string;
  status?: string;
  type?: string;
  username?: string;
};

export const UserManager = () => {
  const { dbs, dbsTables, dbsMethodSchema, dbsSql, user } = usePrglCore();

  let content: React.ReactNode;
  if (!canManageBusinessAccess(user?.type)) {
    content = <div>Must be admin to access this section</div>;
  } else if (user.passwordless_admin) {
    content = <PasswordlessSetup />;
  } else {
    content = (
      <SmartCardList
        className="w-fit as-center"
        db={dbs}
        sql={dbsSql}
        methods={dbsMethodSchema}
        title={t.Users["Prostgles UI users"]}
        tableName="users"
        tables={dbsTables}
        flat={false}
        showTopBar={true}
        showEdit={true}
        realtime={true}
      />
    );
  }

  return (
    <div
      className={
        "flex-col relative w-full f-1 min-h-0 " +
        (window.isLowWidthScreen ? "" : " px-2 ")
      }
    >
      {content}
    </div>
  );
};
