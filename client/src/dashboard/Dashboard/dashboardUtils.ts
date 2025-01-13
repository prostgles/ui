import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import type { DBSchemaTable, ValidatedColumnInfo } from "prostgles-types";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { SearchAllProps } from "../SearchAll";

import type {
  MissingBinsOption,
  TimechartRenderStyle,
  StatType,
  TimeChartBinSize,
  TooltipPosition,
  ShowBinLabelsMode,
} from "../W_TimeChart/W_TimeChartMenu";

import type { SQLSuggestion } from "../SQLEditor/SQLEditor";
import type { RefreshOptions } from "../W_Table/TableMenu/W_TableMenu";

import type { SmartGroupFilter } from "../../../../commonTypes/filterUtils";
import type { OmitDistributive } from "../../../../commonTypes/utils";
import type { Extent, MapExtentBehavior } from "../Map/DeckGLMap";
import type {
  ColumnConfig,
  ColumnSort,
} from "../W_Table/ColumnMenu/ColumnMenu";
import type { DBGeneratedSchema } from "../../../../commonTypes/DBGeneratedSchema";
const getRandomElement = <Arr>(
  items: Arr[],
): { elem: Arr | undefined; index: number } => {
  const randomIndex = Math.floor(Math.random() * items.length);
  return { elem: items[randomIndex], index: randomIndex };
};
type ColorFunc = {
  (opacity: number, target: "deck"): number[];
  (opacity?: number, target?: "css"): string;
};
export type GetColor = { get: ColorFunc };

export const PALETTE = {
  c1: {
    get: (opacity = 1, target: "deck" | "css" = "css") => {
      const v = [
        0,
        129,
        167,
        target === "css" ? opacity : Math.round(opacity * 255),
      ];
      return target === "deck" ? v : (`rgba(${v.join(", ")})` as any);
    },
  },
  c2: {
    get: (opacity = 1, target: "deck" | "css" = "css") => {
      const v = [
        240,
        113,
        103,
        target === "css" ? opacity : Math.round(opacity * 255),
      ];
      return target === "deck" ? v : (`rgba(${v.join(", ")})` as any);
    },
  },
  c3: {
    get: (opacity = 1, target: "deck" | "css" = "css") => {
      const v = [
        58,
        134,
        255,
        target === "css" ? opacity : Math.round(opacity * 255),
      ];
      return target === "deck" ? v : (`rgba(${v.join(", ")})` as any);
    },
  },
  c4: {
    get: (opacity = 1, target: "deck" | "css" = "css") => {
      const v = [
        131,
        56,
        236,
        target === "css" ? opacity : Math.round(opacity * 255),
      ];
      return target === "deck" ? v : (`rgba(${v.join(", ")})` as any);
    },
  },
  c5: {
    get: (opacity = 1, target: "deck" | "css" = "css") => {
      const v = [
        203,
        149,
        0,
        target === "css" ? opacity : Math.round(opacity * 255),
      ];
      return target === "deck" ? v : (`rgba(${v.join(", ")})` as any);
    },
  },
} as const;

export const getRandomColor = (
  opacity = 1,
  target: "deck" | "css" = "css",
  usedColors?: any[],
) => {
  const results = Object.values(PALETTE).map((p) => p.get(opacity, target));
  const nonUsedColors = results.filter(
    (c) =>
      !usedColors?.some((uc) =>
        typeof uc === "string" ? uc === c : uc.join() === c.join(),
      ),
  );
  return getRandomElement(nonUsedColors).elem ?? results[0];
};

export type ChartType =
  | "table"
  | "map"
  | "timechart"
  | "sql"
  | "card"
  | "method";

export type DBSSchemaForHandlers = {
  [K in keyof DBGeneratedSchema]: DBGeneratedSchema[K]["columns"];
};

export const vibrateFeedback = (duration = 15) => {
  try {
    navigator.vibrate(duration);
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

export type OnAddChart = (args: NewChartOpts) => void;

export type Query = {
  id: string;
  tableName: string;
  filter?: any;
  sort?: ColumnSort;
  geo?: {
    field: string;
    filterField: string;
    getData: (ext4326: number[]) => Promise<any[]>;
  };
  layout: { x: number; y: number; w: number; h: number } | any;
};

export type JoinFilter = {
  tablePath: string[];
  filter: any;
};

export type WQuery = Query & {
  joins?: string[];
  joinFilter?: JoinFilter;
};

export type MapExtent = [[number, number], [number, number]];

export type ChartOptions<CType extends ChartType = "table"> =
  CType extends "table" ?
    {
      hideCount?: boolean;
      maxRowHeight?: number;
      maxCellChars?: number;
      // viewAsCard?: boolean;
      viewAs?:
        | { type: "table" }
        | { type: "json" }
        | {
            type: "card";
            hideCardFieldNames?: boolean;
            cardRows?: number;
            hideEmptyCardCells?: boolean;
            cardCellMinWidth?: string;
            cardGroupBy?: string;
            cardOrderBy?: string;
            maxCardRowHeight?: number;
            maxCardWidth?: string;
          };
      hideEditRow?: boolean;
      showFilters?: boolean;
      showSubLabel?: boolean;
      filterOperand?: "AND" | "OR";
      havingOperand?: "AND" | "OR";
    }
  : CType extends "method" ?
    {
      args?: Record<string, any>;
      disabledArgs?: string[];
      hiddenArgs?: string[];
      showCode?: boolean;
    }
  : CType extends "card" ?

    {
      // sortableFields: string[];
      // filterFields: string[];
      // fieldConfigs?: FieldConfigNested[]
    }
  : CType extends "map" ?
    Partial<{
      extent: number[];
      latitude: number;
      longitude: number;
      zoom: number;
      pitch: number;
      bearing: number;
      colorField?: string;
      tileURLs?: string[];
      tileSize?: number;
      showAddShapeBtn?: boolean;
      hideLayersBtn?: boolean;
      showCardOnClick?: boolean;
      tileAttribution?: {
        title: string;
        url: string;
      };
      extentBehavior?: MapExtentBehavior;
      projection?: "mercator" | "orthographic";
      target?: [number, number, number];
      aggregationMode?: {
        type: "limit" | "wait";
        limit: number;
        wait: number;
      };
      dataOpacity: number;
      basemapDesaturate: number;
      basemapOpacity: number;
      basemapImage?: {
        url: string;
        bounds: Extent;
      };
    }>
  : CType extends "timechart" ?
    {
      //@deprecated - moving this to each layer
      statType: StatType;
      /**
       * @deprecated
       */
      dateColumn?: string;
      binSize?: TimeChartBinSize;
      tooltipPosition?: TooltipPosition;
      missingBins?: MissingBinsOption;
      renderStyle?: TimechartRenderStyle;
      showBinLabels?: ShowBinLabelsMode;
      binValueLabelMaxDecimals?: number | null;
      filter?: { min: number; max: number } | null;
    }
  : CType extends "sql" ?
    {
      /**
       * Used to show/hide results table in
       */
      hideTable?: boolean;

      /**
       * If false then ask user about saving the query
       */
      sqlWasSaved?: boolean;

      /**
       * Used for sql queries table inserted from search
       * If sql wasn't changed by user then allow closing window without asking for saving
       */
      sqlChanged?: boolean;

      /**
       * Used to restore cursor position within sql query
       */
      cursorPosition?: {
        column: number;
        lineNumber: number;
      };

      sqlResultCols?: (Pick<
        ValidatedColumnInfo,
        "tsDataType" | "udt_name" | "name"
      > & {
        idx: number;
        key: string;
        // label: string;
        subLabel: string;
        width?: number;
        sortable: boolean;
      })[];

      lastSQL?: string;
    }
  : {
      notSEtYet: "a";
    };

export const IsMap = (w?: any): w is SyncDataItem<WindowData<"map">> => {
  return w?.type === "map";
};
export const IsTable = (w?: any): w is SyncDataItem<WindowData<"table">> => {
  return w?.type === "table";
};
export const isMethod = (
  w?: SyncDataItem<WindowData> | WindowData,
): w is WindowSyncItem<"method"> => {
  return w?.type === "method";
};
export const IsSQL = (w: any): w is SyncDataItem<WindowData<"sql">> => {
  return w.type === "sql";
};
export const IsTimeChart = (
  w?: any,
): w is SyncDataItem<WindowData<"timechart">> => {
  return w?.type === "timechart";
};

type Windows = Required<DBSSchema>["windows"];

export const TopHeaderClassName = "TopHeader";

export type WindowData<CType extends ChartType = ChartType> = Omit<
  Windows,
  "columns" | "options" | "sort" | "filter" | "type" | "having"
> & {
  type: CType;
  id: string;
  table_oid: number;
  sql?: string;
  table_name: CType extends "table" ? Exclude<Windows["table_name"], null>
  : null | string;
  method_name: CType extends "method" ? Exclude<Windows["method_name"], null>
  : null | string;
  name: string;
  last_updated: string;
  fullscreen?: boolean;
  show_menu?: boolean;
  closed?: boolean;
  deleted: boolean;
  workspace_id?: string;
  options?: RefreshOptions & ChartOptions<CType>;
  filter?: SmartGroupFilter;
  having?: SmartGroupFilter;
  columns?: ColumnConfig[] | null;
  /**
   * This is either the sql user has selected OR the current code block
   */
  selected_sql?: string;

  nested_tables?: Record<
    string,
    {
      label?: string;
      cols: ColumnConfig[];
      path: string[];
    }
  >;
  user_id: string;
  limit: number | null;
  sort: null | ColumnSort[];
};

export const windowIs = <T extends ChartType>(
  w: WindowData,
  type: T,
): w is WindowData<T> => {
  return w.type === type;
};

type ChartsObj = {
  [type in ChartType]: SyncDataItem<Required<WindowData<type>>, true>;
};
type ChartsObjOfUnion<U extends ChartType> = { [K in U]: ChartsObj[K] }[U];

export type WindowSyncItem<T extends ChartType = ChartType> =
  ChartsObjOfUnion<T>; // SyncDataItem<Required<WindowData<T>>, true>;
export type LinkSyncItem = SyncDataItem<Link, true>;

export type WorkspaceSchema = DBSSchema["workspaces"];

export type Workspace = Required<WorkspaceSchema>;

export type WorkspaceSyncItem = SyncDataItem<Workspace, true>;

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

export type AcessControlUserTypes = DBSSchema["access_control_user_types"];

export type Backups = DBSSchema["backups"];

export type LoadedSuggestions = {
  dbKey: string;
  connectionId: string;
  suggestions: SQLSuggestion[];
  settingSuggestions: SQLSuggestion[];
  searchAll?: SearchAllProps["suggestions"];
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
export type DBSchemaTableWJoins = DBSchemaTable & {
  joins: Join[];
  joinsV2: JoinV2[];
};
export type DBSchemaTablesWJoins = DBSchemaTableWJoins[];
