// Using the below typescript definition return:
//  1) a json workspace/dashboard config for a property management company ensuring all table and column names are snake case:
//  2) a postgres sql script (with postgis if required) to create and populate the tables with dummy data

type WorkspaceConfig = {
  workspaces: {
    name: string;
    options?: any;
    windows: {
      type: "table";
      table_name: string;
      columns?: {
        name: string;
        show?: boolean;
        width?: number;
        nested?: any;
        style?: {
          type: "Conditional";
          conditions: {
            color: string;
            operator: "=";
            chipColor: string;
            condition: string;
            textColor: string;
            borderColor: string;
          }[];
        };
        format?: any;
      }[];
      options?: any;
      sort?: { asc: boolean; key: string }[];
    }[];
  }[];
};

export const workspaceConfig: WorkspaceConfig = {
  workspaces: [
    {
      name: "Property Management Dashboard",
      options: {
        hideCounts: false,
        pinnedMenu: true,
        tableListSortBy: "extraInfo",
        tableListEndInfo: "count",
        defaultLayoutType: "tab",
      },
      windows: [
        {
          type: "table",
          table_name: "property_listings",
          columns: [
            { name: "property_id", show: true, width: 100 },
            { name: "address", show: true, width: 200 },
            { name: "property_type", show: true, width: 100 },
            { name: "status", show: true, width: 100 },
            { name: "price", show: true, width: 120, format: "currency" },
          ],
          sort: [{ asc: true, key: "price" }],
        },
        {
          type: "table",
          table_name: "tenant_information",
          columns: [
            { name: "tenant_id", show: true, width: 100 },
            { name: "name", show: true, width: 150 },
            { name: "lease_start", show: true, width: 120, format: "date" },
            { name: "lease_end", show: true, width: 120, format: "date" },
            {
              name: "monthly_rent",
              show: true,
              width: 120,
              format: "currency",
            },
          ],
          sort: [{ asc: true, key: "lease_start" }],
        },
        {
          type: "table",
          table_name: "maintenance_requests",
          columns: [
            { name: "request_id", show: true, width: 100 },
            { name: "property_id", show: true, width: 100 },
            { name: "issue", show: true, width: 200 },
            { name: "status", show: true, width: 100 },
            { name: "reported_date", show: true, width: 120, format: "date" },
          ],
          sort: [{ asc: false, key: "reported_date" }],
        },
      ],
    },
  ],
};
