import { USER_TYPES } from "@common/authTypesAndConstants";
import { ROUTES } from "@common/utils";
import Btn from "@components/Btn";
import { Icon } from "@components/Icon/Icon";
import { MenuList } from "@components/MenuList";
import PopupMenu from "@components/PopupMenu";
import {
  mdiAccountOutline,
  mdiAccountStarOutline,
  mdiLogin,
  mdiLogout,
} from "@mdi/js";
import React from "react";
import { NavLink, useNavigate } from "react-router";
import type { ClientUser } from "../App";
import { t } from "../i18n/i18nUtils";

type P = {
  forNavBar?: boolean;
  user: ClientUser | undefined;
};

export const AccountMenu = ({ user, forNavBar }: P) => {
  const navigate = useNavigate();

  if (!user || user.type === USER_TYPES.PUBLIC) {
    if (!forNavBar) {
      return (
        <Btn
          variant="filled"
          color="action"
          size="default"
          asNavLink
          href={ROUTES.LOGIN}
          children={t.common["Login"]}
          iconPath={mdiLogin}
        />
      );
    }

    return (
      <NavLink
        key={"account"}
        data-key={"/account"}
        className={
          "text-0 ml-auto flex-row as-center ai-center gap-p5  bb font-16 min-w-0"
        }
        to={ROUTES.LOGIN}
      >
        <Icon className="f-0" path={mdiLogin} size={1} />
        <div className="f-1 min-w-0 text-ellipsis ws-no-wrap">
          {t.common["Login"]}
        </div>
      </NavLink>
    );
  }

  const iconPath =
    user.type === USER_TYPES.ADMIN ? mdiAccountStarOutline : mdiAccountOutline;

  const cannotLogout = user.passwordless_admin;
  if (forNavBar) {
    return (
      <>
        <NavLink
          key={"account"}
          data-key={"/account"}
          className={
            "text-0 ml-auto flex-row ai-center gap-p5  bb font-16 min-w-0"
          }
          to={ROUTES.ACCOUNT}
        >
          <Icon className="f-0" path={iconPath} />
          <div className="f-1 min-w-0 text-ellipsis ws-no-wrap">
            {user.name || user.username || "??"}
          </div>
        </NavLink>

        {!cannotLogout && (
          <>
            <form
              id="logout-form"
              action={ROUTES.LOGOUT}
              method="POST"
              style={{ display: "none" }}
            ></form>
            <a
              key={"logout"}
              data-command="NavBar.logout"
              href="#"
              onClick={() => {
                (
                  document.getElementById(
                    "logout-form",
                  ) as HTMLFormElement | null
                )?.submit();
              }}
              className="ws-nowrap text-0 font-16 flex-row ai-center gap-p5"
            >
              <Icon className="f-0" path={mdiLogout} size={1} />
              <div className="f-1 min-w-0 text-ellipsis ws-no-wrap">
                {t.common["Logout"]}
              </div>
            </a>
          </>
        )}
      </>
    );
  }

  return (
    <PopupMenu
      positioning="beneath-right"
      contentStyle={{ padding: 0, borderRadius: 0 }}
      className="as-center"
      rootStyle={{ borderRadius: 0 }}
      button={
        <Btn
          variant="filled"
          color="indigo"
          size="small"
          title={[user.username || "Account", user.email]
            .filter(Boolean)
            .join("\n")}
          className="ai-center jc-center font-18"
          style={{
            borderRadius: "50%",
          }}
          iconProps={{
            path: "",
            children: (
              <text
                x="12"
                y="12"
                textAnchor="middle"
                dominantBaseline="central"
                fill="currentColor"
              >
                {user.username.slice(0, 1).toUpperCase()}
              </text>
            ),
          }}
        />
      }
    >
      <MenuList
        style={{ borderRadius: 0 }}
        items={[
          {
            label: t.AccountMenu["Account"],
            leftIconPath:
              user.type === USER_TYPES.ADMIN ?
                mdiAccountStarOutline
              : mdiAccountOutline,
            onPress: () => {
              return navigate(ROUTES.ACCOUNT);
            },
          },
          {
            label: t.common["Logout"],
            leftIconPath: mdiLogout,
            onPress: () => {
              window.location.href = ROUTES.LOGOUT;
            },
            disabledText:
              cannotLogout ? "Cannot logout as passwordless admin" : undefined,
          },
        ]}
      />
    </PopupMenu>
  );
};
