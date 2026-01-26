import React from "react";
import type { AppContextProps } from "../App";
import RTComp from "./RTComp";

import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
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

type S = {
  collapsed: boolean;
  loading: boolean;
};

export default class UserManager extends RTComp<AppContextProps, S> {
  render() {
    const { dbs, dbsTables, user, dbsMethodSchema, dbsSql } = this.props;

    let content: React.ReactNode;
    if (user?.type !== "admin") {
      content = <div>Must be admin to access this section</div>;
    } else if (user.passwordless_admin) {
      content = <PasswordlessSetup {...this.props} />;
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
  }
}
