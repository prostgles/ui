import { t } from "./i18n/i18nUtils";
import type { ReactChild } from "react";
import React, { useState } from "react";
import { NavLink, Navigate, Route, Routes as Switch } from "react-router-dom";
import "./App.css";
import Loading from "./components/Loading";
import type { CommonWindowProps } from "./dashboard/Dashboard/Dashboard";
import { Connections } from "./pages/Connections/Connections";
import NewConnnection from "./pages/NewConnection/NewConnnection";
import { NotFound } from "./pages/NotFound";
import { ProjectConnection } from "./pages/ProjectConnection/ProjectConnection";

import {
  mdiAccountMultiple,
  mdiAlertOutline,
  mdiServerNetwork,
  mdiServerSecurity,
} from "@mdi/js";
import ErrorComponent from "./components/ErrorComponent";
import { NavBar } from "./components/NavBar";
import UserManager from "./dashboard/UserManager";
import { Account } from "./pages/Account/Account";
import { ServerSettings } from "./pages/ServerSettings/ServerSettings";

import type { AuthHandler } from "prostgles-client/dist/Auth";
import {
  type DBHandlerClient,
  type MethodHandler,
} from "prostgles-client/dist/prostgles";
import { type Socket } from "socket.io-client";
import type { ServerState } from "../../commonTypes/electronInit";
import type { DBSSchema } from "../../commonTypes/publishUtils";
import { createReactiveState, useReactiveState } from "./appUtils";
import Btn from "./components/Btn";
import { FlexCol, FlexRow } from "./components/Flex";
import { InfoRow } from "./components/InfoRow";
import PopupMenu from "./components/PopupMenu";
import type { DBS, DBSMethods } from "./dashboard/Dashboard/DBS";
import { MousePointer } from "./demo/MousePointer";
import { LanguageSelector } from "./i18n/LanguageSelector";
import { ComponentList } from "./pages/ComponentList";
import { ElectronSetup } from "./pages/ElectronSetup";
import { Login } from "./pages/Login/Login";
import { NonHTTPSWarning } from "./pages/NonHTTPSWarning";
import { ThemeSelector } from "./theme/ThemeSelector";
import { useAppTheme } from "./theme/useAppTheme";
import { useDBSConnection } from "./useDBSConnection";
import { isDefined } from "./utils";
import { API_PATH_SUFFIXES } from "../../commonTypes/utils";

export type ClientUser = {
  sid: string;
  uid: string;
  type: string;
  state_db_id: string;
  has_2fa: boolean;
} & DBSSchema["users"];

export type ClientAuth = {
  user?: ClientUser;
};
export type Theme = "dark" | "light";
export type ExtraProps = {
  setTitle: (content: string | ReactChild) => any;
  dbs: DBS;
  dbsTables: CommonWindowProps["tables"];
  dbsMethods: DBSMethods;
  user: DBSSchema["users"] | undefined;
  auth: AuthHandler;
  dbsSocket: Socket;
  theme: Theme;
} & Pick<Required<AppState>, "serverState">;

export type PrglStateCore = Pick<
  ExtraProps,
  "dbs" | "dbsMethods" | "dbsTables"
>;
export type PrglState = Pick<
  ExtraProps,
  | "auth"
  | "dbs"
  | "dbsMethods"
  | "dbsTables"
  | "dbsSocket"
  | "user"
  | "serverState"
  | "theme"
> & {
  setTitle: (content: ReactChild) => void;
};
export type PrglCore = {
  db: DBHandlerClient | DBS;
  methods: MethodHandler;
  tables: CommonWindowProps["tables"];
};
export type PrglProject = PrglCore & {
  dbKey: string;
  connectionId: string;
  databaseId: number;
  projectPath: string;
  connection: DBSSchema["connections"] | undefined;
};
export type Prgl = PrglState & PrglProject;

export type AppState = {
  /**
   * Used to re-render dashboard on dbs reconnect
   */
  dbsKey?: string;
  prglState?: {
    dbsWsApiPath: string;
    dbs: DBS;
    dbsTables: CommonWindowProps["tables"];
    dbsMethods: any;
    dbsSocket: Socket;
    auth: AuthHandler;
    isAdminOrSupport: boolean;
    user?: DBSSchema["users"];
    sid: string;
  };
  prglStateErr?: any;
  serverState?: {
    ok: boolean;
  } & ServerState;
  title: React.ReactNode;
  isConnected: boolean;
};

export const r_useAppVideoDemo = createReactiveState({ demoStarted: false });

export const App = () => {
  const [isDisconnected, setIsDisconnected] = useState(false);
  const state = useDBSConnection(setIsDisconnected);
  const [title, setTitle] = useState<React.ReactNode>("");
  const {
    state: { demoStarted },
  } = useReactiveState(r_useAppVideoDemo);

  const user = state.prglState?.user ?? state.prglState?.auth.user;
  const { theme, userThemeOption } = useAppTheme(state);
  if (state.serverState?.isElectron && !state.prglState) {
    return <ElectronSetup serverState={state.serverState} />;
  }

  const error =
    state.serverState?.connectionError ||
    state.serverState?.initError ||
    state.prglStateErr;

  if (!error && (!state.dbsKey || !state.prglState)) {
    return (
      <div className="flex-row m-auto ai-center jc-center  p-2">
        <Loading id="main" message="Connecting to state database..." />
      </div>
    );
  }

  if (error || !state.prglState) {
    return (
      <div className="flex-col m-auto ai-center jc-center  p-2">
        {state.serverState?.connectionError && (
          <div className="ml-1 text-lg font-bold mb-1 pre">
            Could not connect to state database. Ensure /server/.env file (or
            environment variables) point to a running and accessible postgres
            server database
          </div>
        )}
        {state.serverState?.initError && (
          <div className="ml-1 text-lg font-bold mb-1 pre">
            Failed to start Prostgles
          </div>
        )}
        <ErrorComponent error={error} withIcon={true} />
      </div>
    );
  }
  const { dbsKey, prglState, serverState } = state;
  const { dbs, dbsTables, dbsMethods, auth, dbsSocket } = prglState;
  const authUser = auth.user as ClientUser | undefined;
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
    serverState: serverState!,
  };

  const withNavBar = (content: React.ReactNode, needsUser?: boolean) => {
    const showLoginRegister =
      needsUser && !extraProps.user && !extraProps.auth.user;
    return (
      <div className="flex-col ai-center w-full f-1 min-h-0">
        <NavBar
          dbs={dbs}
          dbsMethods={dbsMethods}
          serverState={serverState}
          user={authUser}
          options={
            serverState?.isElectron ?
              []
            : [
                {
                  label: t["App"]["Connections"],
                  to: API_PATH_SUFFIXES.DASHBOARD,
                  iconPath: mdiServerNetwork,
                },
                {
                  label: t["App"]["Users"],
                  to: "/users",
                  forAdmin: true,
                  iconPath: mdiAccountMultiple,
                },
                {
                  label: t["App"]["Server settings"],
                  to: "/server-settings",
                  forAdmin: true,
                  iconPath: mdiServerSecurity,
                },

                // { label: "Permissions", to: "/access-management", forAdmin: true },
              ]
                .filter(isDefined)
                .filter((o) => !o.forAdmin || extraProps.user?.type === "admin")
          }
          endContent={
            <FlexRow className={window.isLowWidthScreen ? "ml-2" : ""}>
              <ThemeSelector
                userId={user?.id}
                dbs={dbs}
                serverState={serverState}
                userThemeOption={userThemeOption}
              />
              <LanguageSelector isElectron={!!serverState?.isElectron} />
            </FlexRow>
          }
        />
        {showLoginRegister ?
          <div className="flex-col jc-center ai-center h-full gap-2 m-2">
            <NavLink to="login">{t.common.Login}</NavLink>
            <NavLink to="register">{t.common.Register}</NavLink>
          </div>
        : content}
      </div>
    );
  };

  return (
    <FlexCol key={dbsKey} className={`App gap-0 f-1 min-h-0`}>
      {serverState?.xRealIpSpoofable && user?.type === "admin" && (
        <PopupMenu
          button={
            <Btn color="danger" iconPath={mdiAlertOutline} variant="filled">
              {t["App"]["Security issue"]}
            </Btn>
          }
          style={{ position: "fixed", right: 0, top: 0, zIndex: 999999 }}
          positioning="beneath-left-minfill"
          clickCatchStyle={{ opacity: 0.5 }}
          content={
            <InfoRow>
              Failed login rate limiting is based on x-real-ip header which can
              be spoofed based on your current connection.{" "}
              <NavLink to="/server-settings">{t["App"]["Settings"]}</NavLink>
            </InfoRow>
          }
        />
      )}
      {demoStarted && <MousePointer />}
      {isDisconnected && (
        <Loading
          message={t.App["Reconnecting..."]}
          variant="cover"
          style={{ zIndex: 467887 }}
        />
      )}
      <NonHTTPSWarning {...prglState} />
      <Switch>
        <Route
          path="/"
          element={<Navigate to={API_PATH_SUFFIXES.DASHBOARD} replace />}
        />
        <Route
          path={API_PATH_SUFFIXES.DASHBOARD}
          element={withNavBar(<Connections {...extraProps} />, true)}
        />
        <Route
          key="1"
          path="/users"
          element={withNavBar(<UserManager {...extraProps} />)}
        />
        ,
        <Route
          key="2"
          path="/account"
          element={withNavBar(<Account {...extraProps} />)}
        />
        ,
        <Route
          key="3"
          path={`${API_PATH_SUFFIXES.DASHBOARD}/:cid`}
          element={<ProjectConnection prglState={extraProps} />}
        />
        ,
        <Route
          key="7"
          path="/new-connection"
          element={
            <NewConnnection
              connectionId={undefined}
              db={undefined}
              prglState={extraProps}
              showTitle={true}
            />
          }
        />
        ,
        <Route
          key="8"
          path="/edit-connection/:id"
          element={
            <NewConnnection
              connectionId={undefined}
              db={undefined}
              prglState={extraProps}
              showTitle={true}
            />
          }
        />
        ,
        <Route
          key="10"
          path="/connection-config/:cid"
          element={
            <ProjectConnection
              prglState={extraProps}
              showConnectionConfig={true}
            />
          }
        />
        ,
        <Route
          key="11"
          path="/server-settings"
          element={withNavBar(<ServerSettings {...extraProps} />, true)}
        />
        <Route
          key="12"
          path="/component-list"
          element={withNavBar(<ComponentList />, false)}
        />
        <Route path="/login" element={<Login {...extraProps} />} />
        <Route path="*" element={<NotFound />} />
      </Switch>
    </FlexCol>
  );
};

export * from "./appUtils";
