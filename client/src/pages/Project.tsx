import React from 'react';
import ErrorComponent from "../components/ErrorComponent";
import Loading from '../components/Loading';
import { tryCatch } from "prostgles-types";
import { mdiArrowLeft } from '@mdi/js';

import { useParams, useSearchParams } from 'react-router-dom';
import { CommonWindowProps, Dashboard, _Dashboard } from "../dashboard/Dashboard/Dashboard";
import RTComp, { DeepPartial } from "../dashboard/RTComp";

import prostgles from "prostgles-client";
import { DBHandlerClient, MethodHandler } from "prostgles-client/dist/prostgles";
import io from "socket.io-client";
import { ExtraProps, Prgl, PrglProject, PrglState } from "../App";
import Btn from '../components/Btn';

import { DBSSchema } from "../../../commonTypes/publishUtils";
import { InfoRow } from "../components/InfoRow";
import { ConnectionConfig } from "../dashboard/ConnectionConfig/ConnectionConfig";

export type Connections = DBSSchema["connections"];
export type ProjectProps = {
  prglState: PrglState;
  params?: { cid?: string };
  setWorkspaceId: (workspaceId: string) => void;
  workspaceId?: string;
  showConnectionConfig?: boolean;
}

type S = {
  dashboardLoading: boolean;
} & (
  {
    prglProject?: undefined;
    error?: undefined;
    state: "loading";
  } | {
    prglProject?: undefined;
    error: any;
    state: "error";
    connNotFound?: boolean;
  } | {
    /**
     * Used to re-render dashboard on db reconnect
     */
    dbKey?: string;
    prglProject: PrglProject;
    error?: undefined;
    loading: false;
    state: "loaded";
  }
);

type D = {

}

export type FullExtraProps = ExtraProps & {
  projectPath?: string;
  dbProject: DBHandlerClient;
  dbMethods: MethodHandler;
  dbTables: CommonWindowProps["tables"];
}

class _Project extends RTComp<ProjectProps, S> {

  state: S = {
    state: "loading",
    dashboardLoading: true,
  }

  static getConnectionTitle = (c: DBSSchema["connections"], short = false) => {
    if (short) return c.db_conn || `${c.db_user}@${c.db_host}:${c.db_port || "5432"}/${c.db_name}`;
    return c.db_conn || `postgres://${c.db_user}:***@${c.db_host}:${c.db_port || "5432"}/${c.db_name}`;
  }

  loaded = false;
  sub = null;
  prj: any;
  async onDelta(deltaP: Partial<ProjectProps>, deltaS: Partial<S>, deltaD?: DeepPartial<D>) {
    const { dbs, dbsMethods } = this.props.prglState;

    const delta = { ...deltaP, ...deltaS, ...deltaD }

    if (delta.prglState?.dbs || Object.keys(dbsMethods).length > 0 && !this.loaded) {
      (window as any).dbs = dbs;

      this.loaded = true;
      const cid = this.props.params?.cid;
      const wid = this.props.workspaceId;
      try {
        const connection = await dbs.connections.findOne({ id: cid });

        if (!connection) {
          this.setState({ 
            state: "error", 
            error: `Could not find connection id: ${cid}`, 
            connNotFound: true, 
            dashboardLoading: false, 
          });
          return;
        }
        if (!this.state.prglProject) {
          this.getDashboardDB(connection);
        }
      } catch (error) {
        console.error(error);
        this.setState({ error, state: "error", dashboardLoading: false, })
      }

    }

  }

  dbSocket: any;
  getDashboardDB = async (con: Connections) => {
    try {

      this.dbSocket?.disconnect();
      const { dbs, dbsMethods, dbsTables } = this.props.prglState;
      const path = await dbsMethods.startConnection?.(con.id);

      // /** If no path then user is connecting to DBS???!. re-use dbs to prevent bugs */
      if (!path) {
        console.error("No path???!!!")
        return;
      }

      this.dbSocket = io(
        {
          path,
          transports: ["websocket"],
          reconnectionDelay: 1000,
          reconnection: true
        }
      );

      //@ts-ignore
      await prostgles({
        socket: this.dbSocket,
        onReady: async (db, methods = {}, tableSchema, auth) => {
          const thisIstheStateDB = auth?.user?.state_db_id === con.id;
          const { tables : dbTables = [], error } =  await _Dashboard.getTables(tableSchema ?? [], undefined, db);
          if(error){
            this.setState({ error, state: "error", });
          } else {
            this.setState({
              prglProject: {
                dbKey: "db-onReady-" + Date.now(),
                connectionId: con.id,
                connection: con,
                db: thisIstheStateDB ? (dbs as any) : db,
                tables: thisIstheStateDB ? dbsTables : dbTables,
                methods: methods,
                projectPath: path,
              },
              state: "loaded",
            });
          }
          (window as any).db = db;
          (window as any).dbMethods = methods;
        }
      });
    } catch (error) {
      this.setState({ error, state: "error", });
    }
  }

  onUnmount() {
    this.dbSocket?.disconnect();
  }

  render() {
    const {
      error, prglProject, state
    } = this.state;
    const { showConnectionConfig, prglState } = this.props;

    if (state === "loading") {
      return <Loading
        id="main"
        delay={0}
        className="m-auto"
        message="Connecting to database..."
        refreshPageTimeout={55000}
      />;
    }

    if (state === "error") {
      return <div className="flex-col w-full h-full ai-center jc-center p-2 gap-1">
        {this.state.connNotFound && <div className="p-1">This project was not found or you are not allowed to access it</div>}
        {!!error && <>Database connection error:<ErrorComponent error={error} findMsg={true} /></>}

        <Btn style={{ fontSize: "18px", fontWeight: "bold" }} className="mt-1" variant="outline" asNavLink={true} href={`/`} iconPath={mdiArrowLeft} color="action">
          Connections
        </Btn>
      </div>
    }


    const prgl: Prgl = {
      ...prglState,
      ...prglProject,
    }

    const connectionId = this.props.params?.cid;
    const { connection } = prglProject;
    if (showConnectionConfig && connectionId) {
      if (connection.is_state_db) {
        return <InfoRow className="h-fit w-fit">This configuration page is not allowed for Prostgles state database</InfoRow>
      }
      return <ConnectionConfig prgl={prgl} connection={connection} />
    }

    return (
      <div className="Project f-1 flex-col h-full w-full min-h-0 min-w-0 relative"
        style={{
          maxWidth: "100vw", maxHeight: "100vh",
          background: this.state.dashboardLoading ? "white" : "var(--gray-800)"
        }}
      >
        <div className="f-1 w-full h-full flex-col" style={prgl.theme === "dark"? { background: "black" } : {}}>
          <Dashboard
            key={this.props.workspaceId}
            prgl={prgl}
            workspaceId={this.props.workspaceId}
            onLoaded={() => {
              if (!this.state.dashboardLoading) return;
              this.setState({ dashboardLoading: false })
            }}
          />
        </div>
      </div>
    );

  }
}

export const Project = (props: Omit<ProjectProps, "workspaceId" | "setWorkspaceId">) => {
  const [sParams, setSearchParams] = useSearchParams();
  const params = useParams();
  return <_Project {...props}
    params={params}
    workspaceId={sParams.get("workspaceId") ?? undefined}
    setWorkspaceId={workspaceId => setSearchParams({ workspaceId })}
  />
};