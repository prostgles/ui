import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./NavBar.css";
 
import { mdiArrowLeft, mdiAccount, mdiServer, mdiMenu, mdiClose } from "@mdi/js"
import { useNavigate } from "react-router-dom";
import { AccountMenu } from "../pages/AccountMenu";
import type { ClientUser, Prgl } from "../App";
import type { ServerState } from "../../../commonTypes/electronInit";
import { InfoRow } from "./InfoRow"; 
import { Icon } from "./Icon/Icon";
 
type P = {
  title?: string;
  options?: { 
    label: string, 
    href?: string, 
    to?: string, 
    exact?: boolean,
    iconPath?: string; 
  }[];
  user: ClientUser | undefined;
  serverState?: ServerState;
  endContent?: React.ReactNode;
} & Pick<Partial<Prgl>, "dbsMethods" | "dbs">;

export const NavBar = (props: P) => {
  const [navCollapsed, setNavCollapsed] = useState(true);
  const navigate = useNavigate();
  const { options = [], title, user, serverState, dbsMethods, dbs, endContent: _endContent } = props;
  const isPublicUser = user?.type === "public";
  const endContent = _endContent? <div onClick={e => { e.stopPropagation(); e.preventDefault(); }}>{_endContent}</div> : null;

  const MenuButton = !title && 
    <button className="hamburger hidden ml-auto text-0" 
      style={{
        alignSelf: "flex-end"
      }}
      onClick={()=>{
        setNavCollapsed(!navCollapsed )
      }}
    >
      {navCollapsed? 
        <Icon path={mdiMenu} size={1.5} /> :
        <Icon path={mdiClose} size={1.5} />}
    </button>

  const navRef = React.useRef<HTMLDivElement>(null);

  /** Close menu when pressing outside */
  useEffect(() => {
    if(navCollapsed) return;
    const listener = (e: MouseEvent) => {
      if(navRef.current && !navRef.current.contains(e.target as Node)){
        setNavCollapsed(true);
      }
    }
    document.addEventListener("pointerdown", listener);
    return () => {
      document.removeEventListener("pointerdown", listener);
    }
  }, [navRef, navCollapsed]);

  return (
    <nav
      ref={navRef} 
      className={"flex-row jc-center noselect w-full text-1p5 shadow-l bg-color-0 " + (navCollapsed? " mobile-collapsed " : " mobile-expanded pb-1 ")} 
      style={{ 
        zIndex: 2, 
      }}
    >
      <div className="flex-row f-1" style={{ maxWidth: "970px"}}>
        {(navCollapsed || !window.isMobileDevice) && <NavLink 
          title="v2.0.0-alpha" 
          to={"/"} 
          className="prgl-brand-icon flex-row ai-center jc-center"
        >
          <img className="p-p5 px-1 mr-2 " src="/prostgles-logo.svg"/>
          {serverState?.isDemoMode && user?.type === "admin" && <div className="DemoMode rounded text-action b b-action px-p75 py-p5 mr-1" 
            onClick={async () => {
              if(!dbs || !dbsMethods) return;
              const con = await dbs.connections.findOne({ db_name: "sales" });
              if(!con) return;
              dbsMethods.makeFakeData!(con.id);
            }}
          >Demo mode</div>}
          {serverState?.isDemoMode && user?.passwordless_admin && <InfoRow color="danger">MUST DISABLE PASSWORDLESS ADMIN!!!</InfoRow>}
        </NavLink>}

        <div className={"flex-col " + (serverState?.isElectron? "f-0 ml-auto jc-center" : "f-1")}>
          <div className="navwrapper flex-row gap-p5 ai-center"
            style={{ order: 2 }}
            onClick={()=>{
              setNavCollapsed(true )
            }}
          >
            {title? (<div className="flex-row ai-center " style={{ minHeight: "60px"}}>
              <button className="f-0 ml-1" onClick={()=>{ navigate(-1) }}><Icon path={mdiArrowLeft} size={1}/></button>
              <div className="f-1 ml-1">{title}</div>
            </div>)
            :
            options.map((o, i) => 
              o.href? 
              <a key={i} href={o.href} className={"text-0 hover ai-center px-1 pt-1 bb font-16  "}> {o.label} </a> 
              : (
              <NavLink 
                key={i} 
                to={o.to as any} 
                className={"text-0 hover gap-p5 flex-row ai-center fs-1 px-1 pt-1 bb font-16"}
              >
                {o.iconPath && <Icon size={1} className="f-0" path={o.iconPath} /> }
                <div className="fs-1 ws-no-wrap text-ellipsis ws-nowrap" >{o.label}</div> 
              </NavLink>
            ))}
            {/* spacer */}
            <div className="f-1"></div>
            {!serverState?.isElectron && <AccountMenu user={user} forNavBar={true} />}
            {endContent}
          </div>
          {MenuButton}
        </div>
      </div>
    </nav>
  );
}


export class LeftNavBar extends React.Component<any, any> {
  render(){
    return (
      <div className="flex-col">
        <ul className="plain flex-col">
          <li>
            <NavLink to={"/projects"} className={"text-0p5 text-white-hover flex-row  bb text-sm font-medium ml-8 transition-150 "}>
              <Icon path={mdiServer} size={1}/>
              <div>Projects</div>
            </NavLink>
          </li>
          <li>
            <NavLink to={"/account"} className={"text-0p5 text-white-hover flex-row  bb text-sm font-medium ml-8 transition-150 "}>
              <Icon path={mdiAccount} size={1}/>
              <div>Account</div>
            </NavLink>
          </li>
        </ul>
      </div>
    )
  }
}