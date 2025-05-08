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
import type { Command } from "../../Testing";
import { ConnectionConfig } from "../../dashboard/ConnectionConfig/ConnectionConfig";
import { useProjectDb } from "./useProjectDb";

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
  const workspaceId = sParams.get("workspaceId") ?? undefined;
  const params = useParams();
  const { prglState, showConnectionConfig } = props;
  const projectDb = useProjectDb({
    prglState,
    connId: params.cid,
  });

  if (projectDb.state === "loading") {
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

  if (projectDb.state === "error") {
    const error = projectDb.error;
    return (
      <div
        className="flex-col w-full h-full ai-center jc-center p-2 gap-1"
        data-command={"ProjectConnection.error" satisfies Command}
      >
        {projectDb.errorType === "connNotFound" && (
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
    ...projectDb,
  };

  const connectionId = params.cid;
  const { connection } = projectDb;
  if (showConnectionConfig && connectionId) {
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
          onLoaded={() => {}}
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
