export const tableConfig: TableConfig = {
  market_caps: {
    columns: {
      image: "TEXT",
    },
  },
};

export const dashboardConfig: DashboardConfig = {
  workspaces: [
    {
      name: "Main",
      windows: [
        {
          type: "table",
          table_name: "",
        },
      ],
    },
  ],
};
