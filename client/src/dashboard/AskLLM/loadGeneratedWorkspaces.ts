import type { WorkspaceInsertModel } from "../../../../commonTypes/DashboardTypes";
import type { Prgl } from "../../App";
import { isDefined, omitKeys } from "../../utils";

export const loadGeneratedWorkspaces = async (basicWorkspaces: WorkspaceInsertModel[], { dbs, connectionId }: Prgl) => {
  const viewIdToIndex: Record<string, number> = {};
  const workspaces = basicWorkspaces.map((bw, i) => {
    const windows = bw.windows.map((bw, wIndex) => {
      viewIdToIndex[bw.id] = wIndex;
      if(bw.type === "map"){
        return {
          type: "map",
          table_name: bw.table_name, 
        }
      }
      if(bw.type === "timechart"){
        return {
          type: "timechart",
          table_name: bw.table_name, 
        }
      }
      return omitKeys(bw, ["id"]);
    });
    return {
      ...bw,
      user_id: undefined as any,
      last_updated: undefined as any,
      connection_id: connectionId,
      windows
    }
  });

  const insertedWorkspaces = await dbs.workspaces.insert(workspaces, { returning: "*" });

  /** Update layouts with correct view id */
  await Promise.all(insertedWorkspaces.map(async (wsp, i) => {
    const layout = { ...(wsp.layout || {}) };
    const fixIds = (layout: any) => {
      if("items" in layout){
        layout.items.forEach((item: any) => {
          fixIds(item);
        });
      } else {
        const viewIndex = basicWorkspaces[i]?.windows.findIndex((w) => w.id === layout.id);
        layout.id = isDefined(viewIndex)? (wsp as any).windows[viewIndex]?.id : layout.id;
      }
    }
    fixIds(layout);
    await dbs.workspaces.update({ id: wsp.id }, { layout });
  }));

  console.log(basicWorkspaces)
}