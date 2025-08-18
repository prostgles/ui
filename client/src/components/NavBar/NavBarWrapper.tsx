import React from "react";
import { NavLink } from "react-router-dom";
import type { PrglState } from "../../App";
import "../../App.css";
import { t } from "../../i18n/i18nUtils";
import { isDefined } from "prostgles-types";

import {
  mdiAccountMultiple,
  mdiServerNetwork,
  mdiServerSecurity,
} from "@mdi/js";
import { NavBar } from "./NavBar";
import { ROUTES } from "../../../../common/utils";
import { FlexRow } from "../Flex";
import { ThemeSelector, type ThemeOption } from "../../theme/ThemeSelector";
import { LanguageSelector } from "../../i18n/LanguageSelector";

type NavBarWrapperProps = {
  children: React.ReactNode;
  needsUser: boolean;
  extraProps: PrglState;
  userThemeOption: ThemeOption;
};
export const NavBarWrapper = (props: NavBarWrapperProps) => {
  const { children, needsUser, extraProps, userThemeOption } = props;
  const { dbs, dbsMethods, serverState, auth, user } = extraProps;
  // const withNavBar = (content: React.ReactNode, ) => {
  const showLoginRegister =
    needsUser && !extraProps.user && !extraProps.auth.user;
  return (
    <div className="flex-col ai-center w-full f-1 min-h-0">
      <NavBar
        dbs={dbs}
        dbsMethods={dbsMethods}
        serverState={serverState}
        user={auth.user}
        options={[
          {
            label: t["App"]["Connections"],
            to: ROUTES.CONNECTIONS,
            iconPath: mdiServerNetwork,
          },
          serverState.isElectron ? undefined : (
            {
              label: t["App"]["Users"],
              to: ROUTES.USERS,
              forAdmin: true,
              iconPath: mdiAccountMultiple,
            }
          ),
          {
            label: t["App"]["Server settings"],
            to: ROUTES.SERVER_SETTINGS,
            forAdmin: true,
            iconPath: mdiServerSecurity,
          },

          // { label: "Permissions", to: "/access-management", forAdmin: true },
        ]
          .filter(isDefined)
          .filter((o) => !o.forAdmin || extraProps.user?.type === "admin")}
        endContent={
          <FlexRow className={window.isLowWidthScreen ? "ml-2" : ""}>
            <ThemeSelector
              userId={user?.id}
              dbs={dbs}
              serverState={serverState}
              userThemeOption={userThemeOption}
            />
            <LanguageSelector isElectron={!!serverState.isElectron} />
          </FlexRow>
        }
      />
      {showLoginRegister ?
        <div className="flex-col jc-center ai-center h-full gap-2 m-2">
          <NavLink to="login">{t.common.Login}</NavLink>
          <NavLink to="register">{t.common.Register}</NavLink>
        </div>
      : children}
    </div>
  );
};
