/**
 * https://github.com/electron-userland/electron-builder/issues/5064
 */
export const contentOfThisFile = `export type LayoutItem = {
  /**
   * UUID of the window
   */
  id: string;
  type: "item";
  title?: string;
  tableName: string | null;
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
     * Join columns: key = parent table column name, value = child table column name
     */
    on: Record<string, string>[];
    /**
     * Table name.
     */
    table: string;
  }[];
} & (LinkedDataChart | LinkedDataTable);

type TableWindowInsertModel = {
  id: string;
  type: "table";
  table_name: string;
  columns?: {
    /**
     * Column name.
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
  filter?: ({
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
        type: "$eq" | "$ne" | "$lt" | "$lte" | "$gt" | "$gte";
        value: string;
      }
  ))[];

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
  table_name: string;
  date_column: string;
  y_axis:
    | "count(*)"
    | {
        column: string;
        aggregation: "sum" | "avg" | "min" | "max" | "count";
      };
};

export type WindowInsertModel =
  | MapWindowInsertModel
  | SqlWindowInsertModel
  | TableWindowInsertModel
  | TimechartWindowInsertModel;

export type WorkspaceInsertModel = {
  name: string;
  layout: LayoutGroup;
  windows: WindowInsertModel[];
};
 
`;
