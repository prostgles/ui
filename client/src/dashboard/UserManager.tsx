import React from "react";
import type { ExtraProps } from "../App";
import RTComp from "./RTComp";

import type { SubscriptionHandler } from "prostgles-types";
import SmartTable from "./SmartTable";
import { PasswordlessSetup } from "./AccessControl/PasswordlessSetup";
import { t } from "../i18n/i18nUtils";

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
  collapsed: Boolean;
  loading: Boolean;
};

export default class UserManager extends RTComp<ExtraProps, S> {
  state: S = {
    collapsed: true,
    loading: true,
  };

  loaded = false;
  sub?: SubscriptionHandler;
  onDelta = async () => {
    const { dbs, user } = this.props;
    // if(dbs && !this.loaded){
    //   this.loaded = true;
    //   this.sub = await dbs.users.subscribe({ username: "prostgles-no-auth-user" }, { orderBy: { created: -1 } }, users => {
    //     this.setState({ users })
    //   })
    // }
  };

  onUnmount() {}

  render() {
    const { dbs, dbsTables, user, dbsMethods, theme } = this.props;

    let content: React.ReactNode;
    if (user?.type !== "admin") {
      content = <div>Must be admin to access this section</div>;
    } else if (user.passwordless_admin) {
      content = <PasswordlessSetup {...this.props} />;
    } else {
      content = (
        <SmartTable
          theme={theme}
          className="w-full"
          db={dbs as any}
          methods={dbsMethods}
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
