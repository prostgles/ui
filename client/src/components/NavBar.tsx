import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./NavBar.css";

import Icon from '@mdi/react'
import { mdiArrowLeft, mdiAccount, mdiServer, mdiMenu, mdiClose } from '@mdi/js'
import { useNavigate } from "react-router-dom";
import { AccountMenu } from "../pages/AccountMenu";
import { ClientUser, Prgl } from "../App";
import { ServerState } from "../../../commonTypes/electronInit";
import { InfoRow } from "./InfoRow"; 
 
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

function NavBar(props: P){
  const [navCollapsed, setNavCollapsed] = useState(true);
  const navigate = useNavigate();
  const { options = [], title, user, serverState, dbsMethods, dbs, endContent } = props;

  const MenuButton = !title && 
    <button className="hamburger hidden ml-auto" 
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

  return (
    <nav className={"flex-row jc-center noselect w-full text-1p5 shadow-l bg-0 " + (navCollapsed? " mobile-collapsed " : "")} 
      style={{ 
        zIndex: 1, 
      }}
    >
      <div className="flex-row f-1" style={{ maxWidth: "970px"}}>
        {(navCollapsed || !window.isMobileDevice) && <NavLink 
          title="v2.0.0-alpha" 
          to={"/"} 
          className="prgl-brand-icon flex-row ai-center jc-center"
        >
          <img className="p-p5 px-1 mr-2 " src="/prostgles-logo.svg"/>
          {serverState?.isDemoMode && user?.type === "admin" && <div className="DemoMode rounded text-blue-600 b b-blue-400 px-p75 py-p5 mr-1" 
            onClick={async () => {
              if(!dbs || !dbsMethods) return;
              const con = await dbs.connections.findOne({ db_name: "sales" });
              if(!con) return;
              dbsMethods.makeFakeData!(con.id);
            }}
          >Demo mode</div>}
          {serverState?.isDemoMode && user?.passwordless_admin && <InfoRow color="danger">MUST DISABLE PASSWORDLESS ADMIN!!!</InfoRow>}
        </NavLink>}
        <div className="flex-col f-1">

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
                className={"text-0 hover gap-p5 flex-row ai-center f-0 px-1 pt-1 bb font-16 f-1 max-s-fit min-w-0 "}
              >
                {o.iconPath && <Icon size={1} className="f-0" path={o.iconPath} /> }
                <div className="f-1 max-s-fit min-w-0 ws-no-wrap text-ellipsis ws-nowrap" >{o.label}</div> 
              </NavLink>
            ))}

            {!serverState?.isElectron && <AccountMenu user={user} forNavBar={true} />}
            {endContent}
          </div>
          {MenuButton}
        </div>

      </div>
    </nav>
  );
}

export default NavBar


export class LeftNavBar extends React.Component<any, any> {
  render(){
    return (
      <div className="flex-col">
        <ul className="plain flex-col">
          <li>
            <NavLink to={"/projects"} className={"text-gray-800 text-white-hover flex-row  bb text-sm font-medium ml-8 transition-150 "}>
              <Icon path={mdiServer} size={1}/>
              <div>Projects</div>
            </NavLink>
          </li>
          <li>
            <NavLink to={"/account"} className={"text-gray-800 text-white-hover flex-row  bb text-sm font-medium ml-8 transition-150 "}>
              <Icon path={mdiAccount} size={1}/>
              <div>Account</div>
            </NavLink>
          </li>
        </ul>
      </div>
    )
  }
}