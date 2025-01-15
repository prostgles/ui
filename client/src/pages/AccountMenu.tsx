import { useNavigate } from "react-router-dom";
import React from "react";
import { NavLink } from "react-router-dom";
import type { ClientUser } from "../App";
import PopupMenu from "../components/PopupMenu";
import Btn from "../components/Btn";
import {
  mdiAccountOutline,
  mdiAccountStarOutline,
  mdiLogin,
  mdiLogout,
} from "@mdi/js";
import { MenuList } from "../components/MenuList";
import { isDefined } from "prostgles-types";
import { Icon } from "../components/Icon/Icon";
import { t } from "../i18n/i18nUtils";

type P = {
  forNavBar?: boolean;
  user: ClientUser | undefined;
};

export const AccountMenu = ({ user, forNavBar }: P) => {
  const navigate = useNavigate();

  if (!user || user.type === "public") {
    return (
      <NavLink
        key={"account"}
        className={
          "text-0 ml-auto flex-row ai-center gap-p5  bb font-16 min-w-0"
        }
        to={"/login"}
      >
        <Icon className="f-0" path={mdiLogin} size={1} />
        <div className="f-1 min-w-0 text-ellipsis ws-no-wrap">
          {t.common["Login"]}
        </div>
      </NavLink>
    );
  }

  const iconPath =
    user.type === "admin" ? mdiAccountStarOutline : mdiAccountOutline;

  const cannotLogout = user.passwordless_admin;

  if (forNavBar) {
    return (
      <>
        <NavLink
          key={"account"}
          className={
            "text-0 ml-auto flex-row ai-center gap-p5  bb font-16 min-w-0"
          }
          to={"/account"}
        >
          <Icon className="f-0" path={iconPath} size={1} />
          <div className="f-1 min-w-0 text-ellipsis ws-no-wrap">
            {user.name || user.username || "??"}
          </div>
        </NavLink>

        {!cannotLogout && (
          <>
            <form
              id="logout-form"
              action="/logout"
              method="POST"
              style={{ display: "none" }}
            ></form>
            <a
              key={"logout"}
              href="#"
              // href="/logout"
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
      rootStyle={{ borderRadius: 0 }}
      button={
        <Btn
          style={{
            paddingBottom: 0,
            color: "var(--gray-100)",
            background: "var(--gray-700)",
          }}
          size="medium"
          title={user.username || "Account"}
          className=" flex-col text-white b g-gray-700"
        >
          <Icon path={iconPath} size={!window.isLowWidthScreen ? 0.75 : 1} />
          {!window.isLowWidthScreen && (
            <div className=" text-2 font-12 ws-nowrap">{user.username}</div>
          )}
        </Btn>
      }
    >
      <MenuList
        style={{ borderRadius: 0 }}
        items={[
          {
            label: t.AccountMenu["Account"],
            leftIconPath:
              user.type === "admin" ? mdiAccountStarOutline : mdiAccountOutline,
            onPress: () => {
              navigate("/account");
            },
          },
          cannotLogout ? undefined : (
            {
              label: t.common["Logout"],
              leftIconPath: mdiLogout,
              onPress: () => {
                window.location.href = "/logout";
              },
            }
          ),
        ].filter(isDefined)}
      />
    </PopupMenu>
  );
};
