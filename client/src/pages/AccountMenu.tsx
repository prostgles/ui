import { useNavigate } from "react-router-dom";
import React from "react";
import { NavLink } from "react-router-dom";
import Icon from "@mdi/react";
import { ClientUser } from "../App";
import PopupMenu from "../components/PopupMenu";
import Btn from "../components/Btn";
import { mdiAccountOutline, mdiAccountStarOutline, mdiLogout } from "@mdi/js";
import MenuList from "../components/MenuList";
import { isDefined } from "prostgles-types";

type P = {
  forNavBar?: boolean;
  user: ClientUser | undefined;
}

export const AccountMenu = ({ user, forNavBar }: P) => {
  const navigate = useNavigate();

  if(!user){
    return null;
  }

  const iconPath = user.type === "admin"? mdiAccountStarOutline : mdiAccountOutline; // mdiAccountCircle

  const cannotLogout = user.passwordless_admin;

  if(forNavBar){

    return <>
       <NavLink key={"account"} to={"/account"} 
        className={"text-0 ml-auto flex-row ai-center gap-p5  bb font-16 min-w-0"}
      >
        <Icon className="f-0" path={iconPath} size={1} />
        <div className="f-1 min-w-0 text-ellipsis ws-no-wrap">{user.username || "??"}</div>
        
      </NavLink>
      
      {!cannotLogout && <a key={"logout"} href="/logout" className="text-0 font-16 flex-row ai-center gap-p5">
        <Icon className="f-0" path={mdiLogout} size={1} />
        <div className="f-1 min-w-0 text-ellipsis ws-no-wrap">Logout</div>
      </a>}
    </>
  }

  return <PopupMenu
    positioning="beneath-right"
    contentStyle={{ padding: 0, borderRadius: 0 }}
    rootStyle={{ borderRadius: 0 }}
    button={(
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
        <Icon path={iconPath} size={!window.isLowWidthScreen? 0.75 : 1} />
        {!window.isLowWidthScreen && <div className=" text-gray-400 font-12 ws-nowrap">{user.username}</div>}
      </Btn>
    )}
  >
    <MenuList style={{  borderRadius: 0 }} 
      items={[
        // { label: user?.username ?? "??", style: { textAlign: "center", background: `var(--blue-100)`, pointerEvents: "none" } },
        { 
          label: "Account",
          leftIconPath: user.type === "admin"? mdiAccountStarOutline : mdiAccountOutline,
          onPress: () => {
            navigate("/account")
          }
        },
        (cannotLogout? undefined : { 
          label: "Logout", 
          leftIconPath: mdiLogout, 
          onPress: () => { window.location.href = "/logout"  } 
        })
      ].filter(isDefined)}
    />
  </PopupMenu>
}