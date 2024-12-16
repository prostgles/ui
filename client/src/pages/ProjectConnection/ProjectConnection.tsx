import { mdiArrowLeft } from "@mdi/js";
import React from "react";
import ErrorComponent from "../../components/ErrorComponent";
import Loading from "../../components/Loading";

import type { CommonWindowProps } from "../../dashboard/Dashboard/Dashboard";
import { Dashboard } from "../../dashboard/Dashboard/Dashboard";

import type {
  DBHandlerClient,
  MethodHandler,
} from "prostgles-client/dist/prostgles";
import type { ExtraProps, Prgl, PrglState } from "../../App";
import Btn from "../../components/Btn";

import { useParams, useSearchParams } from "react-router-dom";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { InfoRow } from "../../components/InfoRow";
import { ConnectionConfig } from "../../dashboard/ConnectionConfig/ConnectionConfig";
import { useProjectDb } from "./useProjectDb";
import { FlexCol } from "../../components/Flex";
import { useNavigate } from "react-router-dom";
import type { Command } from "../../Testing";

export type Connections = DBSSchema["connections"];
export type ProjectProps = {
  prglState: PrglState;
  showConnectionConfig?: boolean;
};

export type FullExtraProps = ExtraProps & {
  projectPath?: string;
  dbProject: DBHandlerClient;
  dbMethods: MethodHandler;
  dbTables: CommonWindowProps["tables"];
};

export const ProjectConnection = (props: ProjectProps) => {
  const [sParams] = useSearchParams();
  const navigate = useNavigate();
  const workspaceId = sParams.get("workspaceId") ?? undefined;
  const params = useParams();
  const { prglState, showConnectionConfig } = props;
  const { error, prglProject, state, connNotFound } = useProjectDb({
    prglState,
    connId: params.cid,
  });

  if (state === "loading") {
    return (
      <Loading
        id="main"
        delay={0}
        className="m-auto"
        message="Connecting to database..."
        refreshPageTimeout={55000}
      />
    );
  }

  if (state === "error") {
    return (
      <div
        className="flex-col w-full h-full ai-center jc-center p-2 gap-1"
        data-command={"ProjectConnection.error" satisfies Command}
      >
        {connNotFound && (
          <div className="p-1">
            This project was not found or you are not allowed to access it
          </div>
        )}
        {!!error && (
          <>
            Database connection error:
            <ErrorComponent error={error} findMsg={true} />
          </>
        )}

        <Btn
          style={{ fontSize: "18px", fontWeight: "bold" }}
          className="mt-1"
          variant="outline"
          asNavLink={true}
          href={`/`}
          iconPath={mdiArrowLeft}
          color="action"
        >
          Connections
        </Btn>
      </div>
    );
  }

  const prgl: Prgl = {
    ...prglState,
    ...prglProject,
  };

  const connectionId = params.cid;
  const { connection } = prglProject;
  if (showConnectionConfig && connectionId) {
    if (connection.is_state_db) {
      return (
        <FlexCol className="w-full h-full ai-center jc-center">
          <InfoRow className="h-fit w-fit ">
            This configuration page is not supported for Prostgles state
            database
          </InfoRow>
          <Btn
            onClick={() => navigate(-1)}
            variant="filled"
            iconPath={mdiArrowLeft}
            color="action"
          >
            Go back
          </Btn>
        </FlexCol>
      );
    }
    return <ConnectionConfig prgl={prgl} connection={connection} />;
  }

  return (
    <div
      className="Project f-1 flex-col h-full w-full min-h-0 min-w-0 relative bg-color-4"
      style={{
        maxWidth: "100vw",
        maxHeight: "100vh",
      }}
    >
      <div
        className="f-1 w-full h-full flex-col"
        style={prgl.theme === "dark" ? { background: "black" } : {}}
      >
        <Dashboard
          key={workspaceId}
          prgl={prgl}
          workspaceId={workspaceId}
          onLoaded={() => {
            // if (!this.state.dashboardLoading) return;
            // this.setState({ dashboardLoading: false })
          }}
        />
      </div>
    </div>
  );
};

const getConnectionTitle = (c: DBSSchema["connections"], short = false) => {
  if (short)
    return (
      c.db_conn ||
      `${c.db_user}@${c.db_host}:${c.db_port || "5432"}/${c.db_name}`
    );
  return (
    c.db_conn ||
    `postgres://${c.db_user}:***@${c.db_host}:${c.db_port || "5432"}/${c.db_name}`
  );
};

// const cached: Record<string, (props: ProjectProps) => JSX.Element> = {};
// function _Project(props: ProjectProps) {
//   const compPath = "./Project";
//   if (!cached[compPath]) {
//     const LazyComponent = React.lazy(() => import(/* webpackChunkName: "_Project" */ "./Project").then(m => ({ default: m._Project })));

//     cached[compPath] = (props: ProjectProps) => <Suspense fallback={<div>Loading</div>}>
//       <LazyComponent { ...props } />
//     </Suspense>
//   }
//   return cached[compPath](props);
// }
