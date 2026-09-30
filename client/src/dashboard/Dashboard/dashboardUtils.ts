import type { ColumnOptions, TableOptions } from "@common/managedTableSchema";
import type { DBSSchema } from "@common/publishUtils";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBSchemaTable } from "prostgles-types";

import type { SQLSuggestion } from "../SQLEditor/W_SQLEditor";

import type { ColumnSortSQL } from "@common/ColumnConfig/ColumnConfig";
import type { ChartType, WindowData } from "@common/ColumnConfig/WindowData";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { type OmitDistributive } from "@common/utils";

export type DBSSchemaForHandlers = {
  [K in keyof DBGeneratedSchema]: DBGeneratedSchema[K]["columns"];
};

export const vibrateFeedback = (duration = 15) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    navigator.vibrate?.(duration);
  } catch (e) {
    console.error(e);
  }
};

export type ChartLink = DBSSchema["links"]["options"];
export type LinkableCharts = "table" | "map" | "timechart";

export type Link = DBSSchema["links"];

export type NewChartOpts = {
  name: string;
  linkOpts: OmitDistributive<ChartLink, "color" | "colorKey">;
};

export type Query = {
  id: string;
  tableName: string;
  filter?: any;
  sort?: ColumnSortSQL;
  geo?: {
    field: string;
    filterField: string;
    getData: (ext4326: number[]) => Promise<any[]>;
  };
  layout: { x: number; y: number; w: number; h: number };
};

export const TopHeaderClassName = "TopHeader";

export const windowIs = <T extends ChartType>(
  w: WindowData,
  type: T,
): w is WindowData<T> => {
  return w.type === type;
};

type ChartsObj = {
  [type in ChartType]: SyncDataItem<
    Required<WindowData<type>>,
    { handlesOnData: true; select: "*" }
  >;
};
type ChartsObjOfUnion<U extends ChartType> = { [K in U]: ChartsObj[K] }[U];

export type WindowSyncItem<T extends ChartType = ChartType> =
  ChartsObjOfUnion<T>;
export type LinkSyncItem = SyncDataItem<Link, { handlesOnData: true }>;

export type WorkspaceSchema = DBSSchema["workspaces"];

export type Workspace = Required<WorkspaceSchema>;

export type WorkspaceSyncItem = SyncDataItem<
  Workspace,
  { handlesOnData: true }
>;

export type UserData = Omit<DBSSchema["users"], "password">;

/**
 * A user group is defined by a filter
 */
export type UserFilter = Record<keyof UserData, any>;

export type UserGroupData = {
  id: string;
  filter: UserFilter;
};
export type UserTypeData = {
  id: string;
};

export type AccessControlUserTypes = DBSSchema["access_control_user_types"];

export type Backups = DBSSchema["backups"];

export type LoadedSuggestions = {
  dbKey: string;
  connectionId: string;
  suggestions: SQLSuggestion[];
  settingSuggestions: SQLSuggestion[];
  /**
   * Must refresh suggestions for CREATE/DROP/ALTER USER because
   * it is not being picked up by the event trigger
   */
  onRenew: VoidFunction;
};

export type Join = {
  tableName: string;
  hasFkeys?: boolean;
  on: [string, string][];
};
export type JoinV2 = Omit<Join, "on"> & { on: [string, string][][] };

export type DBSchemaTableWJoins = DBSchemaTable<
  Omit<TableOptions, "label" | "columns"> & {
    label: string;
    joins: Join[];
    joinsV2: JoinV2[];
  },
  ColumnOptions
>;
export type DBSchemaTablesWJoins = DBSchemaTableWJoins[];
