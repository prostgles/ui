import React, { ReactChild, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes as Switch } from "react-router-dom";
import './App.css';
import Loading from './components/Loading';
import { CommonWindowProps } from './dashboard/Dashboard/Dashboard';
import { Connections } from './pages/Connections/Connections';
import Login from './pages/Login';
import NewConnnection from './pages/NewConnection/NewConnnection';
import NotFound from "./pages/NotFound";
import { Project } from './pages/Project';
import Register from './pages/Register';

import { mdiAccountMultiple, mdiAlertBox, mdiServerNetwork, mdiServerSecurity, mdiThemeLightDark } from "@mdi/js";
import { IDisposable } from "monaco-editor";
import Btn from "./components/Btn";
import ErrorComponent from './components/ErrorComponent';
import { InfoRow } from "./components/InfoRow";
import NavBar from "./components/NavBar";
import UserManager from "./dashboard/UserManager";
import { Account } from "./pages/Account";
import { ServerSettings } from "./pages/ServerSettings";

import { DBHandlerClient, MethodHandler } from 'prostgles-client/dist/prostgles';
import type { ServerState } from "../../commonTypes/electronInit";
import { DBSSchema } from "../../commonTypes/publishUtils";
import { DBS, DBSMethods } from "./dashboard/Dashboard/DBS";
import { ElectronSetup } from "./pages/ElectronSetup";
import { useDBSConnection } from "./useDBSConnection";
import Select from "./components/Select/Select";
import { createReactiveState } from "./dashboard/ProstglesMethod/hooks";


export type ClientUser = {
  sid: string;
  uid: string;
  type: string;
  state_db_id: string;
  has_2fa: boolean;
} & DBSSchema["users"];

export type ClientAuth = {
  user?: ClientUser
}
export type Theme = "dark" | "light";
export type ExtraProps = {
  setTitle: (content: string | ReactChild) => any;
  dbs: DBS;
  dbsTables: CommonWindowProps["tables"];
  dbsMethods: DBSMethods;
  user: DBSSchema["users"] | undefined;
  auth: ClientAuth | undefined;
  dbsSocket: SocketIOClient.Socket;
  theme: Theme;
} & Pick<Required<AppState>, "serverState">;

export type PrglStateCore = Pick<ExtraProps, "dbs" | "dbsMethods" | "dbsTables">
export type PrglState = Pick<ExtraProps, "auth" | "dbs" | "dbsMethods" | "dbsTables" | "dbsSocket" | "user" | "serverState" | "theme"> & {
  setTitle: (content: ReactChild) => void;
};
export type PrglCore = {
  db: DBHandlerClient;
  methods: MethodHandler;
  tables: CommonWindowProps["tables"];
}
export type PrglProject = PrglCore & {
  dbKey: string;
  connectionId: string;
  projectPath: string;
  connection: DBSSchema["connections"];
};
export type Prgl = PrglState & PrglProject;

export type AppState = {
  /**
   * Used to re-render dashboard on dbs reconnect
   */
  dbsKey?: string;
  prglState?: {
    dbs: DBS;
    dbsTables: CommonWindowProps["tables"];
    dbsMethods: any;
    dbsSocket: SocketIOClient.Socket;
    auth: ClientAuth;
    isAdminOrSupport: boolean;
    user?: DBSSchema["users"];
  };
  prglStateErr?: any;
  serverState?: {
    ok: boolean;
  } & ServerState;
  title: React.ReactNode;
  isConnected: boolean;
}

declare global {
  interface Window {
    __prglIsImporting: any;
    /**
     * /Mobi/i.test(window.navigator.userAgent);
     */
    isMobileDevice: boolean;
    /**
     * window.matchMedia("(any-hover: none)").matches
     */
    isTouchOnlyDevice: boolean;
    /**
     * window.innerWidth < 700
     */
    isLowWidthScreen: boolean;
    /**
     * window.innerWidth < 1200
     */
    isMediumWidthScreen: boolean;
    isIOSDevice: boolean;
    sqlCompletionProvider: IDisposable;
  }
}

export const themeR = createReactiveState<Theme>("light")

function iOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
    // iPad on iOS 13 detection
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}
window.isIOSDevice = iOS();

window.isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
window.isTouchOnlyDevice = window.matchMedia("(any-hover: none)").matches;
window.isLowWidthScreen = window.innerWidth < 700;
window.isMediumWidthScreen = window.innerWidth < 1200;

function App() {

  const [isDisconnected, setIsDisconnected] = useState(false);
  const state = useDBSConnection(setIsDisconnected);
  const [title, setTitle] = useState<React.ReactNode>("");

  const user = state?.prglState?.user ?? state?.prglState?.auth.user;
  const userTheme = getTheme(user?.options?.theme ?? "from-system");
  const [theme, setTheme] = useState(userTheme);
  themeR.set(theme);

  useEffect(() => {
    const listener = (event: MediaQueryListEvent) => {
      const newColorScheme = event.matches ? "dark" : "light";
      setTheme(newColorScheme)
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);

    return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', listener);
  }, [user]);

  useEffect(() => {
    if(!user?.options?.theme) return;
    if(theme !== userTheme){
      setTheme(userTheme);
    }
  }, [user, userTheme, theme]);
  
  useEffect(() => {
    document.documentElement.classList.remove("dark-theme", "light-theme");
    document.documentElement.classList.add(`${theme}-theme`);
    document.body.classList.add("text-0");
    if(!state.serverState?.isElectron){
      document.body.classList.add("bg-1");
    }
  }, [theme])

  if (state?.serverState?.isElectron && !state.prglState) {
    return <ElectronSetup serverState={state.serverState} />
  }

  const error = !state ? undefined : (state.serverState?.connectionError || state.serverState?.initError || state.prglStateErr);

  if (!error && (!state || !state.dbsKey || !state.prglState)) {
    return <div className="flex-row m-auto ai-center jc-center  p-2">
      <Loading id="main" message="Connecting to state database..." />
    </div>;
  }

  if (error || !state?.prglState) {
    return <div className="flex-col m-auto ai-center jc-center  p-2" >
      {state?.serverState?.connectionError && <div className="ml-1 text-lg font-bold mb-1 pre">Could not connect to state database. Ensure /server/.env file (or environment variables) point to a running and accessible postgres server database</div>}
      {state?.serverState?.initError && <div className="ml-1 text-lg font-bold mb-1 pre">Failed to start Prostgles</div>}
      <ErrorComponent error={error} withIcon={true} />
    </div>
  }
  const { dbsKey, prglState, serverState } = state;
  const { dbs, dbsTables, dbsMethods, auth, dbsSocket } = prglState;
  const authUser = auth.user;


  const extraProps: PrglState = {
    setTitle: (content: ReactChild) => {
      if (title !== content) setTitle(content);
    },
    dbs,
    dbsTables,
    dbsSocket,
    dbsMethods,
    user: prglState.user,
    auth,
    theme,
    serverState: serverState!
  };


  const withNavBar = (content: React.ReactNode, needsUser?: boolean) => <div className="flex-col ai-center w-full f-1 min-h-0">
    <NavBar
      dbs={dbs}
      dbsMethods={dbsMethods}
      serverState={serverState}
      user={authUser}
      options={serverState?.isElectron ? [] :
        [
          { label: "Connections", to: "/connections", iconPath: mdiServerNetwork },
          { label: "Users", to: "/users", forAdmin: true, iconPath: mdiAccountMultiple },
          { label: "Server settings", to: "/server-settings", forAdmin: true, iconPath: mdiServerSecurity },

          // { label: "Permissions", to: "/access-management", forAdmin: true },
        ].filter(o => (!o.forAdmin || extraProps.user?.type === "admin"))
      }
      endContent={
        <Select  
          title="Theme"
          btnProps={{
            variant: "default",
            iconPath: mdiThemeLightDark,
            children: ""
          }}
          value={userTheme}
          fullOptions={[
            { key: "light", label: "Light"}, 
            { key: "dark", label: "Dark", subLabel: "Work in progress"}, 
            { key: "from-system", label: "System"}
          ]}
          onChange={theme => {
            dbs.users.update({ id: user?.id }, { options: { ...user?.options, theme } })
          }}
        />
      }
    />
    {(needsUser && (!extraProps.user)) ? (<div className="flex-col jc-center ai-center h-full gap-2 m-2">
      <NavLink to="login">Login</NavLink>
      <NavLink to="register">Register</NavLink>
    </div>) : content}
  </div>

  return (
    <div key={dbsKey} className={`App flex-col f-1 min-h-0`}>
      {isDisconnected && <Loading message="Reconnecting..." variant="cover" style={{ zIndex: 467887 }} />}
      <NonHTTPSWarning {...prglState} />
      <Switch >
        <Route path="/" element={<Navigate to="/connections" replace />} />
        <Route path="/connections" element={withNavBar(<Connections {...extraProps} />, true)} />
        <Route key="1" path="/users" element={withNavBar(<UserManager {...extraProps} />)} />,
        <Route key="2" path="/account" element={withNavBar(<Account {...extraProps} />)} />,
        <Route key="3" path="/connections/:cid" element={<Project prglState={extraProps} />} />,
        <Route key="7" path="/new-connection" 
          element={(
            <NewConnnection 
              connectionId={undefined} 
              db={undefined} 
              prglState={extraProps} 
              showTitle={true}
            />
          )} 
        />,
        <Route key="8" path="/edit-connection/:id" 
          element={(
            <NewConnnection 
              connectionId={undefined} 
              db={undefined} 
              prglState={extraProps}
              showTitle={true}
            />
          )} 
        />,
        <Route key="10" path="/connection-config/:cid" element={<Project prglState={extraProps} showConnectionConfig={true} />} />,
        <Route key="11" path="/server-settings" element={withNavBar(<ServerSettings {...extraProps} />, true)} />
        <Route path="/login" element={<Login {...extraProps} />} />
        <Route path="/register" element={<Register {...extraProps} />} />
        <Route path="*" element={<NotFound />} />
      </Switch>
    </div>
  );
}

const NonHTTPSWarning = ({ dbs, auth }: Required<AppState>["prglState"]) => {
  const authUser = auth.user;
  if (
    location.protocol !== "https:" &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1" &&
    !authUser?.options?.hideNonSSLWarning
  ) {
    const canUpdateUsers = !!dbs.users.update as boolean;
    return <InfoRow color="danger" iconPath={mdiAlertBox} className="m-p5 bg-0">
      Your are accessing this page over a non-HTTPS connection!
      You should not enter any sensitive information on this site (passwords, secrets)
      {canUpdateUsers && <Btn onClickPromise={async () => {
        dbs.users.update({ id: authUser?.id }, { options: { ...authUser?.options, hideNonSSLWarning: true } });
        location.reload();
      }}>Do not show again</Btn>}
    </InfoRow>
  }

  return null;
}
 
const getTheme = (desired: Theme | "from-system" = "from-system" ): Theme => {
  if(desired !== "from-system") return desired;
  return window.matchMedia('(prefers-color-scheme: dark)').matches? "dark" : "light";
}

export default App