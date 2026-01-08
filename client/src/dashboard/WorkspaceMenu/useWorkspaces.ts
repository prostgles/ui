import { ROUTES } from "@common/utils";
import type { DBS } from "../Dashboard/DBS";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import type { Workspace } from "../Dashboard/dashboardUtils";

export const useWorkspaces = (
  dbs: DBS,
  userId: string,
  connectionId: string,
) => {
  const unsortedWorkspaces = useWorkspacesSync(dbs, connectionId);
  const workspaces = useMemo(() => {
    return (
      unsortedWorkspaces
        .slice(0)
        .sort((a, b) => +new Date(a.created!) - +new Date(b.created!))
        .map((wsp) => ({
          ...wsp,
          isMine: wsp.user_id === userId,
        }))
        /** Exclude editable original workspaces */
        .filter(
          (wsp) => wsp.isMine || !wsp.published || wsp.layout_mode === "fixed",
        )
    );
  }, [unsortedWorkspaces, userId]);

  return { workspaces };
};

const WorkspaceIdSearchParam = "workspaceId" as const;
export const getWorkspacePath = (
  w: Pick<Workspace, "id" | "connection_id">,
) => {
  return [
    ROUTES.CONNECTIONS,
    `${w.connection_id}?${WorkspaceIdSearchParam}=${w.id}`,
  ]
    .filter((v) => v)
    .join("/");
};

export const useSetActiveWorkspace = (
  currentWorkspaceId: string | undefined,
) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setWorkspace = useCallback(
    (w: Pick<Workspace, "id" | "connection_id"> | undefined) => {
      if (!w) {
        searchParams.delete(WorkspaceIdSearchParam);
        setSearchParams(searchParams);
        return;
      }
      if (w.id === currentWorkspaceId) {
        return;
      }
      const path = getWorkspacePath(w);

      void navigate(path);
    },
    [currentWorkspaceId, navigate, searchParams, setSearchParams],
  );

  return { setWorkspace };
};

/**
 * The purpose of this is to ensure that we reuse sync'd workspaces
 */
export const useWorkspacesSync = (dbs: DBS, connection_id: string) => {
  const { data: unsortedWorkspaces = [] } = dbs.workspaces.useSync!(
    { connection_id, deleted: false },
    { handlesOnData: true, select: "*", patchText: false },
  );
  return unsortedWorkspaces;
};
