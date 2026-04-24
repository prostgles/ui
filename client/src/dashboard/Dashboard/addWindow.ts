import type { DetailedFilter } from "@common/filterUtils";
import type { ChartType, WindowData } from "./dashboardUtils";
import type { DBS } from "./DBS";
import type { DBSSchema } from "@common/publishUtils";
import { pageReload } from "@components/Loader/Loading";

export const addWindow = async <CT extends ChartType>(
  dbs: DBS,
  w: { type: CT } & Partial<
    Pick<WindowData, "name" | "table_name" | "options" | "parent_window_id">
  >,
  workspaceId: string,
  filter: DetailedFilter[] = [],
) => {
  const {
    options = {
      showFilters: false,
      refresh: { type: "Realtime", throttleSeconds: 1 },
    },
    type,
    table_name,
    name,
    ...otherWindowOpts
  } = w;
  const res = await dbs.windows.insert(
    {
      ...otherWindowOpts,
      name,
      type,
      table_name,
      options,
      filter,
      fullscreen: false,
      workspace_id: workspaceId,
      limit: 500,
    } as DBSSchema["windows"],
    { returning: "*" },
  );

  setTimeout(() => {
    if (
      !document.querySelector(`[data-box-id="${res.id}"]`) &&
      !otherWindowOpts.parent_window_id
    ) {
      console.error("SYNC FAIL BUG, REFRESHING");
      void pageReload("SYNC FAIL BUG");
    }
  }, 1000);

  return res;
};
