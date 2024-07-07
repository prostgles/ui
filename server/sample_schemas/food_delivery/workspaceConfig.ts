// Using the below typescript definition return 
// a json workspace/dashboard config for a property management company ensuring all table and column names are snake case:

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
            operator: "=",
            chipColor: string;
            condition: string;
            textColor: string;
            borderColor: string;
          }[]
        } | {
          type: "Barchart";
          barColor: string;
          textColor: string;
        }
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
      name: "Main",
      options: {
        "hideCounts": false,
        "pinnedMenu": true,
        "defaultLayoutType": "col"
      },
      windows: [
      ]
    }
  ]
};
