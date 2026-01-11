import React from "react";
import { NavLink } from "react-router";
import type { PrglState } from "../../App";
import "../../App.css";
import { t } from "../../i18n/i18nUtils";

import { LanguageSelector } from "../../i18n/LanguageSelector";
import { ThemeSelector, type ThemeOption } from "../../theme/ThemeSelector";
import { FlexRow } from "../Flex";
import { NavBar } from "./NavBar";
import { useNavBarItems } from "./useNavBarItems";

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

  const options = useNavBarItems(extraProps);
  return (
    <div className="flex-col ai-center w-full f-1 min-h-0">
      <NavBar
        dbs={dbs}
        dbsMethods={dbsMethods}
        serverState={serverState}
        user={auth.user}
        options={options}
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
