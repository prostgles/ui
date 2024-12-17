// Using the below typescript definition return
// a json workspace/dashboard config for a property management company ensuring all table and column names are snake case:

type WorkspaceConfig = {
  workspaces: {
    name: string;
    options?: any;
    layout?: any;
    windows: {
      type: "table";
      table_name: string;
      columns?: {
        name: string;
        show?: boolean;
        width?: number;
        nested?: any;
        style?:
          | {
              type: "Conditional";
              conditions: {
                color: string;
                operator: "=";
                chipColor: string;
                condition: string;
                textColor: string;
                borderColor: string;
              }[];
            }
          | {
              type: "Barchart";
              barColor: string;
              textColor: string;
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
      name: "Crypto markets",
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
          table_name: "market_caps",
          options: {
            refresh: {
              type: "Realtime",
              intervalSeconds: 3,
              throttleSeconds: 0,
            },
            maxCellChars: 500,
          },
          columns: [
            {
              name: " ",
              width: 50,
            },
            {
              name: "image",
              show: true,
              width: 60,
              format: {
                type: "Media",
                params: {
                  type: "fixed",
                  fixedContentType: "image",
                },
              },
            },
            {
              name: "name",
              show: true,
              width: 100,
            },
            {
              name: "id",
              show: true,
              width: 100,
            },
            {
              name: "market_cap",
              show: true,
              style: {
                type: "Barchart",
                barColor: "#05b0df",
                textColor: "#646464",
              },
              width: 100,
            },
            {
              name: "symbol",
              show: true,
              width: 100,
            },
            {
              name: "ath",
              show: true,
              width: 100,
            },
            {
              name: "atl",
              show: true,
              width: 100,
            },
            {
              name: "roi",
              show: true,
              width: 100,
            },
            {
              name: "low_24h",
              show: true,
              width: 100,
            },
            {
              name: "ath_date",
              show: true,
              width: 100,
              format: {
                type: "Age",
                params: {
                  variant: {
                    type: "short",
                  },
                },
              },
            },
            {
              name: "atl_date",
              show: true,
              width: 100,
              format: {
                type: "Age",
                params: {
                  variant: {
                    type: "short",
                  },
                },
              },
            },
            {
              name: "high_24h",
              show: true,
              width: 100,
            },
            {
              name: "max_supply",
              show: true,
              width: 100,
            },
            {
              name: "last_updated",
              show: true,
              width: 100,
            },
            {
              name: "total_supply",
              show: true,
              width: 100,
            },
            {
              name: "total_volume",
              show: true,
              width: 100,
            },
            {
              name: "current_price",
              show: true,
              width: 100,
            },
            {
              name: "market_cap_rank",
              show: true,
              width: 100,
            },
            {
              name: "price_change_24h",
              show: true,
              width: 100,
            },
            {
              name: "circulating_supply",
              show: true,
              width: 100,
            },
            {
              name: "ath_change_percentage",
              show: true,
              width: 100,
            },
            {
              name: "atl_change_percentage",
              show: true,
              width: 100,
            },
            {
              name: "market_cap_change_24h",
              show: true,
              width: 100,
            },
            {
              name: "fully_diluted_valuation",
              show: true,
              width: 100,
            },
            {
              name: "price_change_percentage_24h",
              show: true,
              width: 100,
            },
            {
              name: "market_cap_change_percentage_24h",
              show: true,
              width: 100,
            },
          ],
          sort: [
            {
              asc: false,
              key: "market_cap",
            },
          ],
        },
        {
          type: "table",
          table_name: "markets",
          options: {
            refresh: {
              type: "Realtime",
              intervalSeconds: 3,
              throttleSeconds: 0,
            },
            maxCellChars: 500,
          },
          columns: [
            {
              name: "gas_prices",
              show: true,
              width: 250,
              nested: {
                path: [
                  {
                    table: "gas_prices",
                    on: [
                      {
                        id: "market",
                      },
                    ],
                  },
                ],
                chart: {
                  type: "time",
                  yAxis: {
                    colName: "price_gwei",
                    funcName: "$avg",
                    isCountAll: false,
                  },
                  dateCol: "timestamp",
                  renderStyle: "smooth-line",
                },
                limit: 200,
                columns: [
                  {
                    name: "id",
                    show: true,
                  },
                  {
                    name: "market",
                    show: true,
                  },
                  {
                    name: "price_gwei",
                    show: true,
                  },
                  {
                    name: "timestamp",
                    show: true,
                  },
                ],
                joinType: "left",
              },
            },
          ],
        },
      ],
    },
  ],
};
