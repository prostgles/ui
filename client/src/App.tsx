import type { ReactChild } from "react";
import React, { useMemo, useState } from "react";
import { Navigate, Route, Routes as Switch } from "react-router";
import "./App.css";
import Loading from "./components/Loader/Loading";
import type { CommonWindowProps } from "./dashboard/Dashboard/Dashboard";
import { t } from "./i18n/i18nUtils";
import { Connections } from "./pages/Connections/Connections";
import NewConnnection from "./pages/NewConnection/NewConnnectionForm";
import { NotFound } from "./pages/NotFound";
import { ProjectConnection } from "./pages/ProjectConnection/ProjectConnection";

import ErrorComponent from "./components/ErrorComponent";
import UserManager from "./dashboard/UserManager";
import { Account } from "./pages/Account/Account";
import { ServerSettings } from "./pages/ServerSettings/ServerSettings";

import type { ProstglesState } from "@common/electronInitTypes";
import type { DBSSchema } from "@common/publishUtils";
import { fixIndent, ROUTES } from "@common/utils";
import type { AuthHandler } from "prostgles-client/dist/getAuthHandler";
import {
  type DBHandlerClient,
  type MethodHandler,
} from "prostgles-client/dist/prostgles";
import { type Socket } from "socket.io-client";
import { CommandPalette } from "./app/CommandPalette/CommandPalette";
import { Documentation } from "./app/CommandPalette/Documentation";
import { XRealIpSpoofableAlert } from "./app/XRealIpSpoofableAlert";
import { createReactiveState, useReactiveState } from "./appUtils";
import { AlertProvider } from "./components/AlertProvider";
import { FlexCol, FlexRow } from "./components/Flex";
import { InfoRow } from "./components/InfoRow";
import { NavBarWrapper } from "./components/NavBar/NavBarWrapper";
import { PostgresInstallationInstructions } from "./components/PostgresInstallationInstructions";
import type { DBS, DBSMethods } from "./dashboard/Dashboard/DBS";
import { MousePointer } from "./demo/MousePointer";
import { ComponentList } from "./pages/ComponentList";
import { ElectronSetup } from "./pages/ElectronSetup/ElectronSetup";
import { Login } from "./pages/Login/Login";
import { NonHTTPSWarning } from "./pages/NonHTTPSWarning";
import { useAppTheme } from "./theme/useAppTheme";
import { useAppState } from "./useAppState/useAppState";

export type ClientUser = {
  sid: string;
  uid: string;
  type: string;
  has_2fa: boolean;
} & DBSSchema["users"];

export type ClientAuth = {
  user?: ClientUser;
};
export type Theme = "dark" | "light";
export type PrglReadyState = {
  /**
   * Used to re-render dashboard on dbs reconnect
   */
  dbsKey: string;
  dbs: DBS;
  dbsTables: CommonWindowProps["tables"];
  dbsMethods: DBSMethods;
  dbsSocket: Socket;
  auth: AuthHandler<ClientUser>;
  isAdminOrSupport: boolean;
  sid: string | undefined;
};
export type ExtraProps = PrglReadyState & {
  setTitle: (content: string | ReactChild) => void;
  user: DBSSchema["users"] | undefined;
  dbsSocket: Socket;
  theme: Theme;
} & Pick<Required<AppState>, "serverState">;

export type PrglStateCore = Pick<
  ExtraProps,
  "dbs" | "dbsMethods" | "dbsTables"
>;
export type PrglState = ExtraProps;

export type PrglCore = {
  db: DBHandlerClient;
  methods: MethodHandler;
  tables: CommonWindowProps["tables"];
};
export type PrglProject = PrglCore & {
  dbKey: string;
  connectionId: string;
  databaseId: number;
  projectPath: string;
  connection: DBSSchema["connections"];
};
export type Prgl = PrglState & PrglProject;

export type AppState = {
  prglState?: PrglReadyState;
  user: DBSSchema["users"] | undefined;
  serverState?: ProstglesState;
  title: React.ReactNode;
  isConnected: boolean;
};

export const r_useAppVideoDemo = createReactiveState({ demoStarted: false });

export const App = () => {
  const [isDisconnected, setIsDisconnected] = useState(false);
  const state = useAppState(setIsDisconnected);
  const [title, setTitle] = useState<React.ReactNode>("");
  const {
    state: { demoStarted },
  } = useReactiveState(r_useAppVideoDemo);

  const { theme, userThemeOption } = useAppTheme(state);
  const extraProps: PrglState | undefined = useMemo(
    () =>
      state.prglState &&
      state.serverState && {
        ...state.prglState,
        setTitle: (content: ReactChild) => {
          if (title !== content) setTitle(content);
        },
        user: state.user,
        theme,
        serverState: state.serverState,
      },
    [state, theme, title],
  );

  const { initState } = state.serverState ?? {};
  const initStateError = initState?.state === "error" ? initState : undefined;
  if (
    state.serverState?.isElectron &&
    ((state.state !== "loading" && state.state !== "ok") ||
      !state.serverState.electronCredsProvided ||
      initStateError)
  ) {
    return <ElectronSetup serverState={state.serverState} />;
  }

  const unknownErrorMessage =
    "Something went wrong with initialising the server. Check console for more details";
  const error =
    state.dbsClientError ||
    (initState?.state === "error" ?
      initState.error || unknownErrorMessage
    : undefined);

  const { prglState, serverState, state: _state } = state;
  if (!error && (!prglState || !serverState || _state === "loading")) {
    return (
      <div className="flex-row m-auto ai-center jc-center  p-2">
        <Loading id="main" message="Connecting to state database..." />
      </div>
    );
  }

  if (error || !prglState || !serverState || !extraProps) {
    const hint =
      state.dbsClientError ?
        errorHints.dbsClientError
      : initStateError?.errorType && errorHints[initStateError.errorType];
    return (
      <FlexCol className="m-auto ai-center jc-center max-w-700 p-2">
        <FlexRow>
          <ErrorComponent
            error={error}
            variant="outlined"
            className="p-2"
            withIcon={true}
          />
          {initStateError?.errorType === "connection" && (
            <PostgresInstallationInstructions placement="state-db" os="linux" />
          )}
        </FlexRow>
        {hint && (
          <InfoRow color="warning" variant="naked">
            {hint}
          </InfoRow>
        )}
      </FlexCol>
    );
  }
  const isElectron = !!serverState.isElectron;
  return (
    <AlertProvider>
      <FlexCol key={prglState.dbsKey} className={`App gap-0 f-1 min-h-0`}>
        <CommandPalette isElectron={isElectron} />
        <XRealIpSpoofableAlert {...state} />
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
            key="0"
            path="/"
            element={<Navigate to={ROUTES.CONNECTIONS} replace />}
          />
          <Route
            key="1"
            path={ROUTES.CONNECTIONS}
            element={
              <NavBarWrapper
                extraProps={extraProps}
                needsUser={true}
                userThemeOption={userThemeOption}
              >
                <Connections {...extraProps} />
              </NavBarWrapper>
            }
          />
          <Route
            key="2"
            path={ROUTES.USERS}
            element={
              <NavBarWrapper
                extraProps={extraProps}
                needsUser={false}
                userThemeOption={userThemeOption}
              >
                <UserManager {...extraProps} />
              </NavBarWrapper>
            }
          />
          <Route
            key="3"
            path={ROUTES.ACCOUNT}
            element={
              <NavBarWrapper
                extraProps={extraProps}
                needsUser={false}
                userThemeOption={userThemeOption}
              >
                <Account {...extraProps} />
              </NavBarWrapper>
            }
          />
          <Route
            key="4"
            path={`${ROUTES.CONNECTIONS}/:connectionId`}
            element={<ProjectConnection prglState={extraProps} />}
          />
          <Route
            key="5"
            path={ROUTES.NEW_CONNECTION}
            element={
              <NewConnnection
                connectionId={undefined}
                db={undefined}
                prglState={extraProps}
                showTitle={true}
              />
            }
          />
          <Route
            key="6"
            path={`${ROUTES.EDIT_CONNECTION}/:id`}
            element={
              <NewConnnection
                connectionId={undefined}
                db={undefined}
                prglState={extraProps}
                showTitle={true}
              />
            }
          />
          <Route
            key="7"
            path={`${ROUTES.CONFIG}/:connectionId`}
            element={
              <ProjectConnection
                prglState={extraProps}
                showConnectionConfig={true}
              />
            }
          />
          <Route
            key="8"
            path={ROUTES.SERVER_SETTINGS}
            element={
              <NavBarWrapper
                extraProps={extraProps}
                needsUser={true}
                userThemeOption={userThemeOption}
              >
                <ServerSettings {...extraProps} />
              </NavBarWrapper>
            }
          />
          <Route
            key="9"
            path={ROUTES.COMPONENT_LIST}
            element={
              <NavBarWrapper
                extraProps={extraProps}
                needsUser={false}
                userThemeOption={userThemeOption}
              >
                <ComponentList />
              </NavBarWrapper>
            }
          />
          <Route
            key="10"
            path={ROUTES.LOGIN}
            element={<Login {...extraProps} />}
          />
          <Route
            key="11"
            path={ROUTES.DOCUMENTATION}
            element={
              <NavBarWrapper
                extraProps={extraProps}
                needsUser={false}
                userThemeOption={userThemeOption}
              >
                <Documentation isElectron={isElectron} />
              </NavBarWrapper>
            }
          />
          <Route key="12" path="*" element={<NotFound />} />
        </Switch>
      </FlexCol>
    </AlertProvider>
  );
};

const errorHints = {
  connection: fixIndent(`
    Could not connect to state database. Ensure /server/.env file (or
    environment variables) point to a running and accessible postgres
    server database`),
  init: "Failed to start Prostgles",
  dbsClientError:
    "Failed to connect to state database. Try refreshing the page or restarting the app.",
};

export * from "./appUtils";
