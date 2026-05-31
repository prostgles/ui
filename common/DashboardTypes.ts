/**
 * IMPORTANT: all table names in this file MUST be after quote_ident() has been applied.
 * For example, MY_Table will appear as '"MY_Table"' in any of the table name related properties below.
 */

export type LayoutItem = {
  /**
   * UUID of the window
   */
  id: string;
  title?: string;
  type: "item";
  /**
   * Table name after quote_ident() has been applied.
   * This means that any table names with uppercase letters or special characters will be quoted.
   * @example
   *  '"MY_Table"'
   *  'my_table'
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

/**
 * This will render a time chart for each row in the table.
 * Useful for showing and comparing time series data for multiple entities
 */
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

/**
 * This will render nested rows for each row in the table.
 */
type LinkedDataTable = {
  limit: number;
  columns: Omit<TableColumn, "nested" | "styling">[];
};

/**
 * Join to linked table.
 */
type TableJoin = {
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
};

/**
 * Show linked data from other tables that are linked to this column through foreign keys
 */
type LinkedData = {
  joinType: "left" | "inner";
  /**
   * Join to linked table.
   * Last table in the path is the target table that columns will refer to.
   */
  path: TableJoin[];
} & (LinkedDataChart | LinkedDataTable);

type Comparator = "$eq" | "$ne" | "$lt" | "$lte" | "$gt" | "$gte";

type BasicFilter = {
  /**
   * Column name
   */
  fieldName: string;
} & (
  | {
      type: "$in";
      value: (string | null)[];
    }
  | {
      /** Not in */
      type: "$nin";
      value: (string | null)[];
    }
  | {
      type: Comparator;
      value: string;
    }
);

type ComplexColumnFilterFunction =
  | {
      /**
       * Age to current day
       * Implemented as pg_catalog.age(column)
       */
      $age: [
        /**
         * Column name with a timestamp / date value
         */
        string,
      ];
    }
  | {
      /**
       * Age to current timestamp
       * Implemented as pg_catalog.age(now(), column)
       */
      $ageNow: [
        /**
         * Column name with a timestamp / date value
         */
        string,
      ];
    };
type ComplexColumnFilter = {
  $filter: [ComplexColumnFilterFunction, Comparator, string | null];
};

type ColumnFilter = BasicFilter | ComplexColumnFilter;

/**
 * Filter that matches rows based on existence of related rows in another table
 */
type JoinedFilter = Record<
  "$existsJoined" | "$notExistsJoined",
  {
    path: TableJoin[];
    /**
     * Filter that will be applied to the joined table (last table in the path)
     */
    filter: ColumnFilter;
  }
>;

type FilterItem = ColumnFilter | JoinedFilter;

export type Filter =
  | FilterItem
  | {
      $and: FilterItem[];
    }
  | {
      $or: FilterItem[];
    };

type Filtering = {
  filter?: FilterItem[];
  /** Defaults to AND */
  filterOperand?: "AND" | "OR";

  /**
   * Predefined quick filters that the user can toggle on/off
   * These are shown in the filter bar under "Quick Filters"
   * MUST ENSURE FILTER VALUES FOR FOREIGN KEYS EXIST IN THE DATABASE
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

export type TableColumn = {
  /**
   * Column name as it appears in the database.
   * For nested columns this can be anything. Use the table name or a more descriptive name.
   */
  name: string;

  /**
   *
   */
  computedConfig?:
    | {
        /**
         * Table column that this computed column is based on.
         */
        column: string;
        aggregation: "sum" | "avg" | "min" | "max" | "count";
      }
    | {
        aggregation: "countAll";
      };

  /**
   * Show linked data from other tables that are linked to this column through foreign keys.
   * If defined then "name" from above should be used as a label for the nested data.
   */
  nested?: LinkedData;

  /**
   * Column width in pixels
   */
  width: number;

  styling?:
    | {
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
      }
    | {
        type: "Icons";
        /**
         * Column value will be mapped to a mdi icon name.
         * @example:
         * {
         *   bar: "GlassCocktail";
         * }
         */
        valueToIconMap: Record<string, string>;
      }
    | {
        /**
         * Column value will be rendered as a horizontal bar with length proportional to the value.
         * Can be used together with nested LinkedData as long as it's LinkedDataTable with a single column, for example:
         * {
            "name": "orders",
            "show": true,
            "style": {
              "type": "Barchart"
              "barColor": "blue",
              "textColor": "#646464",
            },
            "width": 150,
            "nested": {
              "columns": [
                {
                  "name": "COUNT ALL",
                  "show": true,
                  "computedConfig": {
                    "aggregation": "countAll"
                  }
                }, 
              ],
              "path": [
                {
                  "on": [
                    {
                      "id": "restaurant_id"
                    }
                  ],
                  "table": "orders"
                }
              ],
              "joinType": "left"
            }
          }
         */
        type: "Barchart";
        barColor?: string;
        textColor?: string;
      }
    | {
        /**
         * Column value will be rendered with a background color based on the value. The color is determined by dividing the range between min and max into equal segments and assigning a color to each segment.
         * Can be used together with nested LinkedData as long as it's LinkedDataTable with a single column.
         */
        type: "Scale";
        barColor?: string;
        textColor?: string;
      };

  /**
   * If set, column value will rendered in a specific way
   */
  format?:
    | {
        /**
         * Column value will be rendered as a link with specific behaviour
         */
        type: "URL" | "Email" | "Tel";
      }
    | {
        /**
         * Render column value as a scannable QR code image
         */
        type: "QR Code";
      }
    | {
        /** Display large numbers with metric prefixes (e.g. 1.2K) */
        type: "Metric Prefix";
      }
    | {
        /**
         * Render column value with a currency symbol
         */
        type: "Currency";
        params:
          | {
              mode: "Fixed";
              /** @example "USD" */
              currencyCode: string;
              metricPrefix?: boolean;
            }
          | {
              mode: "From column";
              /** Column which contains the currency code  */
              currencyCodeField: string;
              metricPrefix?: boolean;
            };
      }
    | {
        /** Display the timestamp value as an age. Short variant (default) shows top two biggest units */
        type: "Age";
        params?: {
          variant: "short" | "full";
        };
      }
    | {
        /** Text content as sanitised html */
        type: "HTML";
      }
    | {
        /** Displays the media from URL. Accepted formats: image, audio or video. Media/Mime type will be used from headers */
        type: "Media";
      };
};

export type TableWindowInsertModel = Filtering & {
  id: string;
  type: "table";
  /**
   * Optional title that will be shown in the window header (Defaults to table_name).
   * Supports template variable ${rowCount} which will be replaced with the actual number of rows in the table.
   */
  title?: string;
  table_name: string;
  columns?: TableColumn[];

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

type LayerDataSource =
  | (Filtering & {
      type: "local-table";
      table_name: string;
      /**
       * Join to linked table (table_name is root table).
       * The charted columns must be from the end table while the filters are from the root table (table_name).
       */
      joinPath?: TableJoin[];
    })
  | {
      type: "sql";
      sql: string;
    };

/**
 * Shows GEOGRAPHY/GEOMETRY data on a map
 */
export type MapWindowInsertModel = {
  id: string;
  type: "map";
  title?: string;
  layers: (LayerDataSource & {
    title?: string;
    /**
     * Column name with GEOGRAPHY/GEOMETRY data
     */
    geoColumn: string;
  })[];
};

/**
 * Allows user to write and excute custom SQL queries with results displayed in a table
 */
export type SqlWindowInsertModel = {
  id: string;
  name: string;
  type: "sql";
  sql: string;
};

/**
 * Shows a time chart
 */
export type TimechartWindowInsertModel = {
  id: string;
  type: "timechart";
  title?: string;
  layers: (LayerDataSource & {
    title?: string;
    dateColumn: string;
    groupByColumn?: string;
    yAxis:
      | "count(*)"
      | {
          aggregation: "sum" | "avg" | "min" | "max" | "count";
          column: string;
        };
  })[];
};
export type BarchartWindowInsertModel = (
  | (Filtering & {
      table_name: string;
    })
  | {
      sql: string;
    }
) & {
  id: string;
  type: "barchart";
  title?: string;
  labelColumn: string;
  numericAxis: {
    column: string;
    aggregation: "sum" | "avg" | "min" | "max" | "count" | "count(*)";
    /**
     * Join to linked table (table_name is root table).
     * The numericAxis.column must be from the end table while the filters are from the root table (table_name).
     */
    joinPath?: TableJoin[];
  };
};

export type WindowInsertModel =
  | MapWindowInsertModel
  | SqlWindowInsertModel
  /**
   * Prefer to use the TableWindowInsertModel for barcharts as it can contain more contextual data.
   */
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
