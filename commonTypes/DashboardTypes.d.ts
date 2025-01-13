export type LayoutItem = {
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
} & ({
    /**
     * Flex direction of the group
     */
    type: "row" | "col";
    items: LayoutConfig[];
} | {
    /**
     * Will display windows as tabs
     */
    type: "tab";
    items: LayoutItem[];
    /**
     * UUID of the currently shown window
     */
    activeTabKey: string | undefined;
});
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
                chipColor: "red" | "pink" | "purple" | "blue" | "indigo" | "green" | "yellow" | "gray";
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
    } & ({
        type: "$in";
        value: string[];
    } | {
        type: "$eq" | "$ne" | "$lt" | "$lte" | "$gt" | "$gte";
        value: string;
    }))[];
    /**
     * Sort order when of type 'table'
     */
    sort?: null | {
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
    y_axis: "count(*)" | {
        column: string;
        aggregation: "sum" | "avg" | "min" | "max" | "count";
    };
};
export type WindowInsertModel = MapWindowInsertModel | SqlWindowInsertModel | TableWindowInsertModel | TimechartWindowInsertModel;
export type WorkspaceInsertModel = {
    name: string;
    layout: LayoutGroup;
    windows: WindowInsertModel[];
};
/**
 * https://github.com/electron-userland/electron-builder/issues/5064
 */
export declare const contentOfThisFile = "export type LayoutItem = {\n  /**\n   * UUID of the window\n   */\n  id: string;\n  type: \"item\";\n  title?: string;\n  tableName: string | null;\n  /**\n   * Flex size of the item\n   */\n  size: number;\n  isRoot?: boolean;\n};\nexport type LayoutGroup = {\n  id: string;\n  size: number;\n  isRoot?: boolean;\n} & (\n  | {\n      /**\n       * Flex direction of the group\n       */\n      type: \"row\" | \"col\";\n      items: LayoutConfig[];\n    }\n  | {\n      /**\n       * Will display windows as tabs\n       */\n      type: \"tab\";\n      items: LayoutItem[];\n      /**\n       * UUID of the currently shown window\n       */\n      activeTabKey: string | undefined;\n    }\n);\n\nexport type LayoutConfig = LayoutItem | LayoutGroup;\n\ntype LinkedDataChart = {\n  chart: {\n    type: \"time\";\n    yAxis: {\n      colName: string;\n      funcName: \"$avg\" | \"$sum\" | \"$min\" | \"$max\" | \"$count\";\n      isCountAll: boolean;\n    };\n    dateCol: string;\n  };\n};\n\ntype LinkedDataTable = {\n  limit: number;\n  columns: {\n    name: string;\n  }[];\n};\n\ntype LinkedData = {\n  joinType: \"left\" | \"inner\";\n  /**\n   * Join to linked table.\n   * Last table in the path is the target table that columns will refer to.\n   */\n  path: {\n    /**\n     * Join columns: key = parent table column name, value = child table column name\n     */\n    on: Record<string, string>[];\n    /**\n     * Table name.\n     */\n    table: string;\n  }[];\n} & (LinkedDataChart | LinkedDataTable);\n\ntype TableWindowInsertModel = {\n  id: string;\n  type: \"table\";\n  table_name: string;\n  columns?: {\n    /**\n     * Column name.\n     */\n    name: string;\n    /**\n     * Column width in pixels\n     */\n    width: number;\n\n    /**\n     * Render column value in a chip\n     * Cannot be used with nested\n     */\n    styling?: {\n      type: \"conditional\";\n      conditions: {\n        chipColor:\n          | \"red\"\n          | \"pink\"\n          | \"purple\"\n          | \"blue\"\n          | \"indigo\"\n          | \"green\"\n          | \"yellow\"\n          | \"gray\";\n        operator: \"=\" | \"!=\" | \">\" | \"<\" | \">=\" | \"<=\";\n        value: string;\n      }[];\n    };\n\n    /**\n     * Show linked data from other tables that are linked to this column through foreign keys\n     */\n    nested?: LinkedData;\n  }[];\n  filter?: ({\n    /**\n     * Column name\n     */\n    fieldName: string;\n  } & (\n    | {\n        type: \"$in\";\n        value: string[];\n      }\n    | {\n        type: \"$eq\" | \"$ne\" | \"$lt\" | \"$lte\" | \"$gt\" | \"$gte\";\n        value: string;\n      }\n  ))[];\n\n  /**\n   * Sort order when of type 'table'\n   */\n  sort?:\n    | null\n    | {\n        /**\n         * Column name\n         */\n        key: string;\n        asc: boolean;\n        nulls: \"first\" | \"last\";\n      }[];\n};\n\n/**\n * Shows GEOGRAPHY/GEOMETRY data on a map\n */\ntype MapWindowInsertModel = {\n  id: string;\n  type: \"map\";\n  table_name: string;\n  /**\n   * Column name with GEOGRAPHY/GEOMETRY data\n   */\n  geo_column: string;\n};\n\n/**\n * Allows user to write and excute custom SQL queries with results displayed in a table\n */\ntype SqlWindowInsertModel = {\n  id: string;\n  name: string;\n  type: \"sql\";\n  sql: string;\n};\n\n/**\n * Shows a time chart\n */\ntype TimechartWindowInsertModel = {\n  id: string;\n  type: \"timechart\";\n  table_name: string;\n  date_column: string;\n  y_axis:\n    | \"count(*)\"\n    | {\n        column: string;\n        aggregation: \"sum\" | \"avg\" | \"min\" | \"max\" | \"count\";\n      };\n};\n\nexport type WindowInsertModel =\n  | MapWindowInsertModel\n  | SqlWindowInsertModel\n  | TableWindowInsertModel\n  | TimechartWindowInsertModel;\n\nexport type WorkspaceInsertModel = {\n  name: string;\n  layout: LayoutGroup;\n  windows: WindowInsertModel[];\n};\n \n";
export {};
