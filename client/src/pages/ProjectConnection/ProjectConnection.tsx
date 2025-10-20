import React from "react";
import Loading from "../../components/Loader/Loading";

import type { CommonWindowProps } from "../../dashboard/Dashboard/Dashboard";
import { Dashboard } from "../../dashboard/Dashboard/Dashboard";

import type {
  DBHandlerClient,
  MethodHandler,
} from "prostgles-client/dist/prostgles";
import type { ExtraProps, Prgl, PrglState } from "../../App";

import { useParams, useSearchParams } from "react-router-dom";
import type { DBSSchema } from "../../../../common/publishUtils";
import { ConnectionConfig } from "../../dashboard/ConnectionConfig/ConnectionConfig";
import { ProjectConnectionError } from "./ProjectConnectionError";
import { useProjectDb } from "./useProjectDb";
import { PrglProvider } from "./PrglContextProvider";

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
    connId: params.connectionId,
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
    return (
      <ProjectConnectionError prglState={prglState} projectDb={projectDb} />
    );
  }

  const prgl: Prgl = {
    ...prglState,
    ...projectDb,
  };

  const connectionId = params.connectionId;
  const { connection } = projectDb;
  if (showConnectionConfig && connectionId) {
    return (
      <PrglProvider prgl={prgl}>
        <ConnectionConfig connection={connection} />
      </PrglProvider>
    );
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
        <PrglProvider prgl={prgl}>
          <Dashboard
            key={workspaceId}
            workspaceId={workspaceId}
            onLoaded={() => {}}
          />
        </PrglProvider>
      </div>
    </div>
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
