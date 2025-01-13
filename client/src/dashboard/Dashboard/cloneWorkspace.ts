import { omitKeys } from "prostgles-types";
import type { LayoutConfig } from "../SilverGrid/SilverGrid";
import type { DBS } from "./DBS";

export const cloneWorkspace = async (
  dbs: DBS,
  workspaceId: string,
  keepName = false,
) => {
  const id = workspaceId;
  const wsp = await dbs.workspaces.findOne({ id });
  if (!wsp) throw new Error("Workspace not found");
  const name = `${wsp.name} (Copy)`;
  const existing = await dbs.workspaces.findOne(
    { name: { $like: `${name.slice(0, -1)}%` } },
    { orderBy: [{ name: -1 }] },
  );
  const tryParseNumber = (str: string) => {
    const num = parseInt(str.trim());
    return isNaN(num) ? 0 : num;
  };
  const existingDigit =
    tryParseNumber(existing?.name.slice(name.length, -1) || "") + 1;
  const newName = existing ? `${wsp.name} (Copy ${existingDigit})` : name;
  const clonedWsp = await dbs.workspaces.insert(
    {
      ...omitKeys(wsp, ["id", "user_id", "publish_mode", "published"]),
      user_id: undefined as any,
      name: keepName ? wsp.name : newName,
      published: false,
      parent_workspace_id: wsp.id,
    },
    { returning: "*" },
  );

  const windows = await dbs.windows.find({ workspace_id: id });
  const links = await dbs.links.find({ workspace_id: id });
  const clonedWindows = await Promise.all(
    windows.map(async (w) => {
      const win = {
        ...omitKeys(w, ["id", "parent_window_id", "user_id"]),
        workspace_id: clonedWsp.id,
        user_id: undefined as any,
      };
      const clonedWindow = await dbs.windows.insert(win, { returning: "*" });
      return clonedWindow;
    }),
  );

  windows.forEach((w, i) => {
    const clonedWindow = clonedWindows[i];
    if (!clonedWindow) throw new Error("clonedWindow not found");
    if (w.parent_window_id) {
      const parentIndex = windows.findIndex(
        (pw) => pw.id === w.parent_window_id,
      );
      const parent = clonedWindows[parentIndex];
      if (!parent) throw new Error("parent not found");
      dbs.windows.update(
        { id: clonedWindow.id },
        { parent_window_id: parent.id },
      );
    }
  });

  const clonedLinks = await Promise.all(
    links.map(async (l) => {
      const lin: typeof l = {
        ...omitKeys(l, ["id", "user_id"]),
        workspace_id: clonedWsp.id,
        user_id: undefined as any,
        id: undefined as any,
        w1_id: clonedWindows[windows.findIndex((w) => w.id === l.w1_id)]!.id,
        w2_id: clonedWindows[windows.findIndex((w) => w.id === l.w2_id)]!.id,
      };
      const clonedLinks = await dbs.links.insert(lin, { returning: "*" });
      return clonedLinks;
    }),
  );

  const replaceIds = (oldId: string) => {
    return clonedWindows[windows.findIndex((w) => w.id === oldId)]?.id ?? oldId;
  };
  const fixIds = (layout: LayoutConfig) => {
    if ("items" in layout) {
      layout.items.forEach((item) => {
        fixIds(item);
      });
    } else {
      layout.id = replaceIds(layout.id);
    }
  };
  const newLayout = { ...(wsp.layout || {}) };
  fixIds(newLayout);
  await dbs.workspaces.update({ id: clonedWsp.id }, { layout: newLayout });

  return {
    clonedWsp,
    clonedLinks,
    clonedWindows,
  };
};
