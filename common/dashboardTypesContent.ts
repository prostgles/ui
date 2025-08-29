/**
 * Generated file. Do not edit.
 * https://github.com/electron-userland/electron-builder/issues/5064
 */
export const dashboardTypesContent = `export type LayoutItem = {
  /**
   * UUID of the window
   */
  id: string;
  title?: string;
  type: "item";
  /**
   * Table name after quote_ident() has been applied.
   * This means that any table names with uppercase letters or special characters will be quoted.
   */
  tableName: string | null;
  viewType: "table" | "map" | "timechart" | "sql" | "barchart";
  /**
   * Flex size of the item
   */
  size: number;
  isRoot?: boolean;
};
export type LayoutGroup = {
  id: string;
  size: number;
  isRoot?: boolean;
} & (
  | {
      /**
       * Flex direction of the group
       */
      type: "row" | "col";
      items: LayoutConfig[];
    }
  | {
      /**
       * Will display windows as tabs
       */
      type: "tab";
      items: LayoutItem[];
      /**
       * UUID of the currently shown window
       */
      activeTabKey: string | undefined;
    }
);

export type LayoutConfig = LayoutItem | LayoutGroup;

type LinkedDataChart = {
  chart: {
    type: "time";
    yAxis: {
      colName: string;
      funcName: "$avg" | "$sum" | "$min" | "$max" | "$count";
      isCountAll: boolean;
    };
    dateCol: string;
  };
};

type LinkedDataTable = {
  limit: number;
  columns: {
    name: string;
  }[];
};

type LinkedData = {
  joinType: "left" | "inner";
  /**
   * Join to linked table.
   * Last table in the path is the target table that columns will refer to.
   */
  path: {
    /**
     * Join columns.
     * property = root table (or previous table) column name
     * value = linked table column name
     * @example
     * path: {
     *   on: [{ user_id: "id" }]
     *   table: "users"
     * }
     */
    on: Record<string, string>[];
    /**
     * Linked table name
     */
    table: string;
  }[];
} & (LinkedDataChart | LinkedDataTable);

type ColumnFilter = {
  /**
   * Column name
   */
  fieldName: string;
} & (
  | {
      type: "$in";
      value: string[];
    }
  | {
      /** Not in */
      type: "$nin";
      value: string[];
    }
  | {
      type: "$eq" | "$ne" | "$lt" | "$lte" | "$gt" | "$gte";
      value: string;
    }
);

export type Filter =
  | ColumnFilter
  | {
      $and: ColumnFilter[];
    }
  | {
      $or: ColumnFilter[];
    };

type Filtering = {
  filter?: ColumnFilter[];
  /** Defaults to AND */
  filterOperand?: "AND" | "OR";

  /**
   * Predefined quick filters that the user can toggle on/off
   * These are shown in the filter bar under "Quick Filters"
   */
  quickFilterGroups?: {
    [groupName: string]: {
      toggledFilterName?: string;
      filters: {
        [filterName: string]: Filter;
      };
    };
  };
};

export type TableWindowInsertModel = Filtering & {
  id: string;
  type: "table";
  /**
   * Optional title that will be shown in the window header (Defaults to table_name).
   * Supports template variable \${rowCount} which will be replaced with the actual number of rows in the table.
   */
  title?: string;
  table_name: string;
  columns?: {
    /**
     * Column name as it appears in the database.
     * For nested columns this can be anything. Use the table name or a more descriptive name.
     */
    name: string;
    /**
     * Column width in pixels
     */
    width: number;

    /**
     * Render column value in a chip
     * Cannot be used with nested
     */
    styling?: {
      type: "conditional";
      conditions: {
        chipColor:
          | "red"
          | "pink"
          | "purple"
          | "blue"
          | "indigo"
          | "green"
          | "yellow"
          | "gray";
        operator: "=" | "!=" | ">" | "<" | ">=" | "<=";
        value: string;
      }[];
    };

    /**
     * Show linked data from other tables that are linked to this column through foreign keys
     */
    nested?: LinkedData;
  }[];

  /**
   * Sort order when of type 'table'
   */
  sort?:
    | null
    | {
        /**
         * Column name
         */
        key: string;
        asc: boolean;
        nulls: "first" | "last";
      }[];
};

/**
 * Shows GEOGRAPHY/GEOMETRY data on a map
 */
type MapWindowInsertModel = {
  id: string;
  type: "map";
  title?: string;
  table_name: string;
  /**
   * Column name with GEOGRAPHY/GEOMETRY data
   */
  geo_column: string;
};

/**
 * Allows user to write and excute custom SQL queries with results displayed in a table
 */
type SqlWindowInsertModel = {
  id: string;
  name: string;
  type: "sql";
  sql: string;
};

/**
 * Shows a time chart
 */
type TimechartWindowInsertModel = {
  id: string;
  type: "timechart";
  title?: string;
  table_name: string;
  date_column: string;
  y_axis:
    | "count(*)"
    | {
        column: string;
        aggregation: "sum" | "avg" | "min" | "max" | "count";
      };
};

type BarchartWindowInsertModel = Filtering & {
  id: string;
  type: "barchart";
  title?: string;
  table_name: string;
  x_axis:
    | "count(*)"
    | {
        column: string;
        aggregation: "sum" | "avg" | "min" | "max" | "count";
      };
  y_axis_column: string;
};

export type WindowInsertModel =
  | MapWindowInsertModel
  | SqlWindowInsertModel
  | TableWindowInsertModel
  | TimechartWindowInsertModel
  | BarchartWindowInsertModel;

export type WorkspaceInsertModel = {
  name: string;
  /**
   * MDI camel case icon name for the workspace that will be shown near the workspace name.
   * example: "AccountCancel", "BriefcaseOutline", "CalendarQuestion"
   * Should ideally be specified when an existing icon gives a good visual description of the workspace.
   */
  icon?: string;
  layout: LayoutGroup;
  windows: WindowInsertModel[];
};

`;