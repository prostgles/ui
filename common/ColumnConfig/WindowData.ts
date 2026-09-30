import type { SQLResult, ValidatedColumnInfo } from "prostgles-types";
import type { DBSSchema } from "../publishUtils";
import type {
  MissingBinsOption,
  ShowBinLabelsMode,
  TimeChartBinSize,
  TimechartRenderStyle,
  TooltipPosition,
} from "./timechartConstants";
import type { CardLayout } from "./cardLayout";
import type { Extent, MapExtentBehaviorOptions } from "./mapConstants";
import type { DetailedFilter } from "../filterUtils";
import type { ColumnConfig, ColumnSort } from "./ColumnConfig";

export type RefreshOptions = {
  readonly refresh?: {
    readonly type: "Realtime" | "None" | "Interval";
    intervalSeconds: number;
    throttleSeconds: number;
  };
};

export type ChartType =
  "table" | "map" | "timechart" | "barchart" | "sql" | "card" | "method";

export type ChartOptions<CType extends ChartType = "table"> =
  CType extends "table" ?
    {
      hideCount?: boolean;
      maxRowHeight?: number;
      maxCellChars?: number;
      quickFilterGroups?: QuickFilterGroups;
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
      cardLayout?: CardLayout;
      hideEditRow?: boolean;
      hideInsertButton?: boolean;
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
      showLogs?: boolean;
    }
  : CType extends "card" ?
    {
      // sortableFields: string[];
      // filterFields: string[];
      // fieldConfigs?: FieldConfigNested[]
    }
  : CType extends "map" ?
    Partial<{
      extent: [number, number, number, number];
      latitude: number;
      longitude: number;
      zoom: number;
      pitch: number;
      bearing: number;
      colorField?: string;
      tileURLs?: string[];
      tileSize?: number;
      basemapZoomOffset?: number;
      showAddShapeBtn?: boolean;
      hideLayersBtn?: boolean;
      showCardOnClick?: boolean;
      enableCollisionFilter?: boolean;
      tileAttribution?: {
        title: string;
        url: string;
      };
      extentBehavior?: MapExtentBehaviorOptions;
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
      yScaleMode?: "single" | "multiple";
      binSize?: TimeChartBinSize;
      tooltipPosition?: TooltipPosition;
      missingBins?: MissingBinsOption;
      renderStyle?: TimechartRenderStyle;
      showBinLabels?: ShowBinLabelsMode;
      showGradient?: boolean;
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
        /**
         * Column index is used as key because column name can be duplicated in sql result
         */
        key: number;
        label: string;
        subLabel: string;
        width?: number;
        sortable: boolean;
      } & SQLResult<"rows">["fields"][number])[];

      lastSQL?: string;
    }
  : {
      notSEtYet: "a";
    };

/**
 * Predefined quick filters that the user can toggle on/off
 * These are shown in the filter bar under "Quick Filters"
 */
export type QuickFilterGroups = {
  [groupName: string]: {
    toggledFilterName?: string;
    filters: {
      [filterName: string]: {};
    };
  };
};
type Windows = Required<DBSSchema>["windows"];
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
  filter?: DetailedFilter[];
  having?: DetailedFilter[];
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
