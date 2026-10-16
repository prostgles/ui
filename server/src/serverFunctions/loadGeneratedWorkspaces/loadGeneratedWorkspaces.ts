import type {
  LayoutConfig,
  WorkspaceInsertModel,
} from "@common/DashboardTypes";
import { type DBSSchema, type DBSSchemaForInsert } from "@common/publishUtils";
import { randomUUID } from "crypto";
import type { DBSClient } from "../..";
import {
  omitKeys,
  postgresToTsType,
  type ColumnInfo,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { loadGeneratedBarchart } from "./loadGeneratedBarchart";
import { loadGeneratedMap } from "./loadGeneratedMap";
import { loadGeneratedTable } from "./loadGeneratedTable";
import { loadGeneratedTimechart } from "./loadGeneratedTimechart";

export const loadGeneratedWorkspaces = async (
  generatedWorkspaces: WorkspaceInsertModel[],
  {
    dbs,
    connectionId,
    tables: schema,
    userId,
    toolUseId,
    config,
  }: {
    dbs: DBSClient;
    connectionId: string;
    tables: { name: string; columns: ColumnInfo[] }[];
    userId: string;
    toolUseId?: string;
    config?: "shared";
  },
) => {
  const tables: WorkspaceTable[] = schema.map(({ name, columns }) => ({
    name,
    columns: columns.map((column) => ({
      ...column,
      tsDataType: postgresToTsType(column.udt_name),
    })),
  }));
  if (config && generatedWorkspaces.length) {
    const existing = await dbs.workspaces.find({
      connection_id: connectionId,
      name: { $in: generatedWorkspaces.map(({ name }) => name) },
      published: true,
    });
    const existingNames = new Set(existing.map(({ name }) => name));
    generatedWorkspaces = generatedWorkspaces.filter(
      ({ name }) => !existingNames.has(name),
    );
  }

  const insertedWorkspaces: DBSSchema["workspaces"][] = [];
  const metadata = { user_id: userId, last_updated: Date.now().toString() };
  for (const workspace of generatedWorkspaces) {
    const windowIds = new Map(
      workspace.windows.map(({ id }) => [id, randomUUID()]),
    );
    const links: { windowId: string; options: LinkOption }[] = [];
    const windows = workspace.windows.map((generatedWindow) => {
      const id = windowIds.get(generatedWindow.id)!;
      let window: WindowInsertModel;
      if (generatedWindow.type === "barchart") {
        window = loadGeneratedBarchart(generatedWindow, tables);
      } else if (generatedWindow.type === "table") {
        window = loadGeneratedTable(generatedWindow, tables);
      } else if (
        generatedWindow.type === "map" ||
        generatedWindow.type === "timechart"
      ) {
        const chart =
          generatedWindow.type === "map" ?
            loadGeneratedMap(generatedWindow)
          : loadGeneratedTimechart(generatedWindow);
        window = chart.window;
        links.push(
          ...chart.linkOptions.map((options) => ({ windowId: id, options })),
        );
      } else {
        window = {
          ...omitKeys(generatedWindow, ["id"]),
          name: generatedWindow.name || "Query",
        };
      }
      return { ...window, id, ...metadata };
    });
    const layout = structuredClone(workspace.layout);
    replaceLayoutIds(layout, windowIds);
    const inserted = await dbs.workspaces.insert(
      {
        name: workspace.name,
        icon: workspace.icon,
        layout,
        windows,
        connection_id: connectionId,
        ...metadata,
        ...(config === "shared" && { published: true }),
        ...(toolUseId && { source: { tool_use_id: toolUseId } }),
        options: { pinnedMenu: false },
        layout_mode: "fixed",
      },
      { returning: "*" },
    );
    if (links.length) {
      await dbs.links.insertMany(
        links.map(({ windowId, options }) => ({
          w1_id: windowId,
          w2_id: windowId,
          workspace_id: inserted.id,
          options,
          ...metadata,
        })),
      );
    }
    insertedWorkspaces.push(inserted);
  }
  return insertedWorkspaces;
};

const replaceLayoutIds = (
  item: LayoutConfig,
  windowIds: Map<string, string>,
) => {
  item.id = windowIds.get(item.id) ?? item.id;
  if ("items" in item) {
    item.items.forEach((child) => replaceLayoutIds(child, windowIds));
  }
  if (item.type === "tab" && item.activeTabKey) {
    item.activeTabKey = windowIds.get(item.activeTabKey) ?? item.activeTabKey;
  }
};

export type WindowInsertModel = Omit<
  DBSSchemaForInsert["windows"],
  "last_updated" | "user_id"
>;

export type LinkOption = DBSSchema["links"]["options"];

export type WorkspaceTable = {
  name: string;
  columns: Pick<ValidatedColumnInfo, "name" | "udt_name" | "tsDataType">[];
};
