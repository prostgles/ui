import { type ParsedJoinPath } from "prostgles-types";
import type { Link, WindowSyncItem } from "./dashboardUtils";
import { addViewToWorkspace } from "./useAddViewToWorkspace";
import { addLink } from "./addLink";
import type { Prgl } from "src/App";

export const onLinkTable = async ({
  prgl,
  q,
  tablePath,
  tableName,
  workspaceId,
  myLinks,
}: {
  prgl: Prgl;
  q: WindowSyncItem;
  tableName: string;
  workspaceId: string;
  tablePath: ParsedJoinPath[];
  myLinks: Link[];
}) => {
  const w2_id = await addViewToWorkspace(
    {
      workspace_id: workspaceId,
      type: "table",
      table: tableName,
      fullscreen: false,
    },
    {
      db: prgl.db,
      dbs: prgl.dbs,
    },
  );
  await addLink({
    dbs: prgl.dbs,
    myLinks,
    newLink: {
      w1_id: q.id,
      w2_id,
      workspace_id: workspaceId,
      linkOpts: { type: "table", tablePath },
    },
  });
  if (q.fullscreen) q.$update({ fullscreen: false });
};
