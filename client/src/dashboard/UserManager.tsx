import React from "react";

import type { DBHandlerClient } from "prostgles-client";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { t } from "../i18n/i18nUtils";
import { PasswordlessSetup } from "./AccessControl/PasswordlessSetup";
import SmartTable from "./SmartTable";

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
  if (user?.type !== "admin") {
    content = <div>Must be admin to access this section</div>;
  } else if (user.passwordless_admin) {
    content = <PasswordlessSetup />;
  } else {
    content = (
      <SmartTable
        className="w-full"
        db={dbs as DBHandlerClient}
        sql={dbsSql}
        methods={dbsMethodSchema}
        titlePrefix={t.Users["Prostgles UI users"]}
        tableName="users"
        tables={dbsTables}
        showInsert={true}
        allowEdit={true}
        realtime={{}}
      />
    );
  }

  return (
    <div
      className={
        "flex-col relative w-full f-1 min-h-0 pt-1 " +
        (window.isLowWidthScreen ? "" : " px-2 ")
      }
    >
      {content}
    </div>
  );
};
