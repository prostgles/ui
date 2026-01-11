export const prostglesUIFoodDeliveryDashboardSample = {
  prostglesWorkspaces: [
    {
      icon: "ClipboardList",
      name: "Order Management",
      layout: {
        id: "order-root",
        size: 1,
        type: "col",
        items: [
          {
            id: "order-top-row",
            size: 0.6,
            type: "row",
            items: [
              {
                id: "orders-table",
                size: 0.7,
                type: "item",
                viewType: "table",
                tableName: "orders",
              },
              {
                id: "order-status-chart",
                size: 0.3,
                type: "item",
                viewType: "timechart",
                tableName: "orders",
              },
            ],
          },
          {
            id: "order-items-table",
            size: 0.4,
            type: "item",
            viewType: "table",
            tableName: "order_items",
          },
        ],
        isRoot: true,
      },
      windows: [
        {
          id: "orders-table",
          sort: [
            {
              asc: false,
              key: "created_at",
              nulls: "last",
            },
          ],
          type: "table",
          columns: [
            {
              name: "id",
              width: 80,
            },
            {
              name: "restaurant_id",
              width: 120,
              nested: {
                path: [
                  {
                    on: [
                      {
                        restaurant_id: "id",
                      },
                    ],
                    table: "restaurants",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "name",
                  },
                ],
                joinType: "left",
              },
            },
            {
              name: "customer_id",
              width: 120,
              nested: {
                path: [
                  {
                    on: [
                      {
                        customer_id: "id",
                      },
                    ],
                    table: "users",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "first_name",
                  },
                  {
                    name: "last_name",
                  },
                ],
                joinType: "left",
              },
            },
            {
              name: "status",
              width: 120,
              styling: {
                type: "conditional",
                conditions: [
                  {
                    value: "pending",
                    operator: "=",
                    chipColor: "yellow",
                  },
                  {
                    value: "confirmed",
                    operator: "=",
                    chipColor: "blue",
                  },
                  {
                    value: "preparing",
                    operator: "=",
                    chipColor: "indigo",
                  },
                  {
                    value: "ready",
                    operator: "=",
                    chipColor: "purple",
                  },
                  {
                    value: "picked_up",
                    operator: "=",
                    chipColor: "gray",
                  },
                  {
                    value: "delivered",
                    operator: "=",
                    chipColor: "green",
                  },
                  {
                    value: "cancelled",
                    operator: "=",
                    chipColor: "red",
                  },
                ],
              },
            },
            {
              name: "total_price",
              width: 100,
            },
            {
              name: "created_at",
              width: 180,
            },
          ],
          table_name: "orders",
        },
        {
          id: "order-status-chart",
          type: "timechart",
          layers: [
            {
              yAxis: "count(*)",
              table_name: "orders",
              dateColumn: "created_at",
            },
          ],
        },
        {
          id: "order-items-table",
          type: "table",
          columns: [
            {
              name: "order_id",
              width: 100,
            },
            {
              name: "menu_item_id",
              width: 120,
              nested: {
                path: [
                  {
                    on: [
                      {
                        menu_item_id: "id",
                      },
                    ],
                    table: "menu_items",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "name",
                  },
                  {
                    name: "category",
                  },
                ],
                joinType: "left",
              },
            },
            {
              name: "quantity",
              width: 80,
            },
            {
              name: "price",
              width: 100,
            },
          ],
          table_name: "order_items",
        },
      ],
    },
    {
      icon: "StorefrontOutline",
      name: "Restaurant Analytics",
      layout: {
        id: "restaurant-root",
        size: 1,
        type: "col",
        items: [
          {
            id: "restaurant-top-row",
            size: 0.5,
            type: "row",
            items: [
              {
                id: "restaurants-table",
                size: 0.6,
                type: "item",
                viewType: "table",
                tableName: "restaurants",
              },
              {
                id: "restaurant-ratings",
                size: 0.4,
                type: "item",
                viewType: "table",
                tableName: "ratings",
              },
            ],
          },
          {
            id: "restaurant-bottom-row",
            size: 0.5,
            type: "row",
            items: [
              {
                id: "menu-items-table",
                size: 0.7,
                type: "item",
                viewType: "table",
                tableName: "menu_items",
              },
              {
                id: "revenue-chart",
                size: 0.3,
                type: "item",
                viewType: "timechart",
                tableName: "orders",
              },
            ],
          },
        ],
        isRoot: true,
      },
      windows: [
        {
          id: "restaurants-table",
          type: "table",
          columns: [
            {
              name: "id",
              width: 80,
            },
            {
              name: "name",
              width: 200,
            },
            {
              name: "address",
              width: 250,
            },
            {
              name: "created_at",
              width: 180,
            },
          ],
          table_name: "restaurants",
        },
        {
          id: "restaurant-ratings",
          sort: [
            {
              asc: false,
              key: "created_at",
              nulls: "last",
            },
          ],
          type: "table",
          columns: [
            {
              name: "restaurant_id",
              width: 120,
              nested: {
                path: [
                  {
                    on: [
                      {
                        restaurant_id: "id",
                      },
                    ],
                    table: "restaurants",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "name",
                  },
                ],
                joinType: "left",
              },
            },
            {
              name: "rating",
              width: 80,
              styling: {
                type: "conditional",
                conditions: [
                  {
                    value: "2",
                    operator: "<=",
                    chipColor: "red",
                  },
                  {
                    value: "3",
                    operator: "=",
                    chipColor: "yellow",
                  },
                  {
                    value: "4",
                    operator: "=",
                    chipColor: "blue",
                  },
                  {
                    value: "5",
                    operator: "=",
                    chipColor: "green",
                  },
                ],
              },
            },
            {
              name: "review",
              width: 300,
            },
            {
              name: "created_at",
              width: 150,
            },
          ],
          table_name: "ratings",
        },
        {
          id: "menu-items-table",
          type: "table",
          columns: [
            {
              name: "restaurant_id",
              width: 120,
              nested: {
                path: [
                  {
                    on: [
                      {
                        restaurant_id: "id",
                      },
                    ],
                    table: "restaurants",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "name",
                  },
                ],
                joinType: "left",
              },
            },
            {
              name: "name",
              width: 200,
            },
            {
              name: "category",
              width: 120,
            },
            {
              name: "price",
              width: 100,
            },
            {
              name: "description",
              width: 300,
            },
          ],
          table_name: "menu_items",
        },
        {
          id: "revenue-chart",
          type: "timechart",
          layers: [
            {
              yAxis: {
                column: "total_price",
                aggregation: "sum",
              },
              table_name: "orders",
              dateColumn: "created_at",
            },
          ],
        },
      ],
    },
    {
      icon: "TruckDelivery",
      name: "Delivery Operations",
      layout: {
        id: "delivery-root",
        size: 1,
        type: "col",
        items: [
          {
            id: "delivery-top-row",
            size: 0.6,
            type: "row",
            items: [
              {
                id: "active-deliveries",
                size: 0.5,
                type: "item",
                viewType: "table",
                tableName: "orders",
              },
              {
                id: "delivery-map",
                size: 0.5,
                type: "item",
                viewType: "map",
                tableName: "v_riders",
              },
            ],
          },
          {
            id: "delivery-status-changes",
            size: 0.4,
            type: "item",
            viewType: "table",
            tableName: "delivery_status_changes",
          },
        ],
        isRoot: true,
      },
      windows: [
        {
          id: "active-deliveries",
          type: "table",
          filter: [
            {
              type: "$in",
              value: ["confirmed", "preparing", "ready", "out_for_delivery"],
              fieldName: "status",
            },
          ],
          columns: [
            {
              name: "id",
              width: 80,
            },
            {
              name: "deliverer_id",
              width: 120,
              nested: {
                path: [
                  {
                    on: [
                      {
                        deliverer_id: "id",
                      },
                    ],
                    table: "users",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "first_name",
                  },
                  {
                    name: "last_name",
                  },
                ],
                joinType: "left",
              },
            },
            {
              name: "status",
              width: 120,
              styling: {
                type: "conditional",
                conditions: [
                  {
                    value: "confirmed",
                    operator: "=",
                    chipColor: "yellow",
                  },
                  {
                    value: "preparing",
                    operator: "=",
                    chipColor: "blue",
                  },
                  {
                    value: "ready",
                    operator: "=",
                    chipColor: "purple",
                  },
                  {
                    value: "out_for_delivery",
                    operator: "=",
                    chipColor: "indigo",
                  },
                ],
              },
            },
            {
              name: "created_at",
              width: 150,
            },
            {
              name: "updated_at",
              width: 150,
            },
          ],
          table_name: "orders",
        },
        {
          id: "delivery-map",
          type: "map",
          layers: [
            {
              geoColumn: "location",
              table_name: "v_riders",
            },
          ],
        },
        {
          id: "delivery-status-changes",
          sort: [
            {
              asc: false,
              key: "created_at",
              nulls: "last",
            },
          ],
          type: "table",
          columns: [
            {
              name: "order_id",
              width: 100,
            },
            {
              name: "delivery_status",
              width: 150,
              styling: {
                type: "conditional",
                conditions: [
                  {
                    value: "assigned",
                    operator: "=",
                    chipColor: "blue",
                  },
                  {
                    value: "picked_up",
                    operator: "=",
                    chipColor: "yellow",
                  },
                  {
                    value: "in_transit",
                    operator: "=",
                    chipColor: "purple",
                  },
                  {
                    value: "delivered",
                    operator: "=",
                    chipColor: "green",
                  },
                ],
              },
            },
            {
              name: "created_at",
              width: 180,
            },
          ],
          table_name: "delivery_status_changes",
        },
      ],
    },
    {
      icon: "MapMarker",
      name: "Geographic Overview",
      layout: {
        id: "geo-root",
        size: 1,
        type: "row",
        items: [
          {
            id: "restaurant-map",
            size: 0.5,
            type: "item",
            viewType: "map",
            tableName: "london_restaurants.geojson",
          },
          {
            id: "user-map",
            size: 0.5,
            type: "item",
            viewType: "map",
            tableName: "customers",
          },
        ],
        isRoot: true,
      },
      windows: [
        {
          id: "restaurant-map",
          type: "map",
          layers: [
            {
              geoColumn: "geometry",
              table_name: "london_restaurants.geojson",
            },
          ],
        },
        {
          id: "user-map",
          type: "map",
          layers: [
            {
              geoColumn: "location",
              table_name: "customers",
            },
          ],
        },
      ],
    },
    {
      icon: "AccountGroup",
      name: "Customer Insights",
      layout: {
        id: "customer-root",
        size: 1,
        type: "col",
        items: [
          {
            id: "customer-top-row",
            size: 0.5,
            type: "row",
            items: [
              {
                id: "customers-table",
                size: 0.6,
                type: "item",
                viewType: "table",
                tableName: "customers",
              },
              {
                id: "customer-orders-chart",
                size: 0.4,
                type: "item",
                viewType: "timechart",
                tableName: "customers",
              },
            ],
          },
          {
            id: "customer-addresses",
            size: 0.5,
            type: "item",
            viewType: "table",
            tableName: "user_addresses",
          },
        ],
        isRoot: true,
      },
      windows: [
        {
          id: "customers-table",
          sort: [
            {
              asc: false,
              key: "total_orders",
              nulls: "last",
            },
          ],
          type: "table",
          filter: [
            {
              type: "$eq",
              value: "customer",
              fieldName: "type",
            },
          ],
          columns: [
            {
              name: "id",
              width: 80,
            },
            {
              name: "first_name",
              width: 120,
            },
            {
              name: "last_name",
              width: 120,
            },
            {
              name: "email",
              width: 200,
            },
            {
              name: "phone_number",
              width: 150,
            },
            {
              name: "total_orders",
              width: 120,
            },
            {
              name: "last_order",
              width: 180,
            },
            {
              name: "created_at",
              width: 180,
            },
          ],
          table_name: "customers",
        },
        {
          id: "customer-orders-chart",
          type: "timechart",
          layers: [
            {
              yAxis: "count(*)",
              table_name: "customers",
              dateColumn: "created_at",
            },
          ],
        },
        {
          id: "customer-addresses",
          type: "table",
          columns: [
            {
              name: "user_id",
              width: 100,
              nested: {
                path: [
                  {
                    on: [
                      {
                        user_id: "id",
                      },
                    ],
                    table: "users",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "first_name",
                  },
                  {
                    name: "last_name",
                  },
                ],
                joinType: "left",
              },
            },
            {
              name: "address_id",
              width: 120,
              nested: {
                path: [
                  {
                    on: [
                      {
                        address_id: "id",
                      },
                    ],
                    table: "addresses",
                  },
                ],
                limit: 1,
                columns: [
                  {
                    name: "street",
                  },
                  {
                    name: "city",
                  },
                  {
                    name: "postal_code",
                  },
                ],
                joinType: "left",
              },
            },
          ],
          table_name: "user_addresses",
        },
      ],
    },
  ],
};

export const dockerWeatherToolUse = {
  files: {
    Dockerfile:
      'FROM node:18-alpine\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY . .\nCMD ["node", "fetch_weather.js"]',
    "package.json":
      '{\n  "name": "weather-fetcher",\n  "version": "1.0.0",\n  "dependencies": {\n    "axios": "^1.6.0"\n  }\n}',
    "fetch_weather.js":
      "const axios = require('axios');\n\nconst DB_URL = 'http://172.17.0.1:3009/db/execute_sql_with_commit';\n// Alternative: Use Open-Meteo (completely free, no API key needed)\nasync function fetchFromOpenMeteo() {\n  const lat = 51.5074; // London latitude\n  const lon = -0.1278; // London longitude\n  \n  // Get last 4 years of data\n  const endDate = new Date();\n  const startDate = new Date();\n  startDate.setFullYear(endDate.getFullYear() - 4);\n  \n  const startDateStr = startDate.toISOString().split('T')[0];\n  const endDateStr = endDate.toISOString().split('T')[0];\n  \n  console.log(`Fetching data from ${startDateStr} to ${endDateStr}...`);\n  \n  try {\n    const response = await axios.get('https://archive-api.open-meteo.com/v1/era5', {\n      params: {\n        latitude: lat,\n        longitude: lon,\n        start_date: startDateStr,\n        end_date: endDateStr,\n        daily: 'temperature_2m_mean,temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max,relative_humidity_2m_mean',\n        timezone: 'Europe/London'\n      }\n    });\n    \n    const data = response.data.daily;\n    \n    for (let i = 10e10; i < data.time.length; i++) {\n      const sql = `\n        INSERT INTO weather_data (\n          city, country, date, temperature_avg, temperature_min, temperature_max,\n          humidity, precipitation, wind_speed, weather_condition\n        ) VALUES (\n          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10\n        ) ON CONFLICT (city, country, date) DO NOTHING\n      `;\n      \n      await axios.post(DB_URL, {\n        sql: sql,\n        query_params: [\n          'London',\n          'United Kingdom',\n          data.time[i],\n          data.temperature_2m_mean[i],\n          data.temperature_2m_min[i],\n          data.temperature_2m_max[i],\n          data.relative_humidity_2m_mean[i],\n          data.precipitation_sum[i],\n          data.windspeed_10m_max[i],\n          'Historical Data'\n        ]\n      });\n      \n      if (i % 100 === 0) {\n        console.log(`✓ Processed ${i + 1}/${data.time.length} records`);\n      }\n    }\n    \n    console.log(`✓ Successfully inserted ${data.time.length} weather records for London`);\n    \n  } catch (error) {\n    console.error('Error fetching from Open-Meteo:', error.message);\n  }\n}\n\n// Run the Open-Meteo version (free, no API key needed)\nfetchFromOpenMeteo().catch(console.error);",
  },
  timeout: 120000,
  networkMode: "bridge",
};

export const prostglesUICryptoDashboardSample = {
  prostglesWorkspaces: [
    {
      icon: "ChartTimelineVariant",
      name: "Multi-Asset Price Comparison",
      layout: {
        id: "root",
        size: 1,
        type: "col",
        items: [
          {
            id: "all-major-prices",
            size: 2,
            type: "item",
            title: "Major Assets Price Comparison",
            viewType: "timechart",
            tableName: "futures",
          },
          {
            id: "price-table",
            size: 1,
            type: "item",
            title: "Latest Prices",
            viewType: "table",
            tableName: "futures",
          },
        ],
        isRoot: true,
      },
      windows: [
        {
          id: "all-major-prices",
          type: "timechart",
          title: "Major Assets Price Comparison",
          layers: [
            {
              type: "local-table",
              title: "BTC",
              yAxis: {
                column: "price",
                aggregation: "avg",
              },
              filter: [
                {
                  type: "$eq",
                  value: "BTCUSDT",
                  fieldName: "symbol",
                },
              ],
              dateColumn: "timestamp",
              table_name: "futures",
            },
            {
              type: "local-table",
              title: "ETH",
              yAxis: {
                column: "price",
                aggregation: "avg",
              },
              filter: [
                {
                  type: "$eq",
                  value: "ETHUSDT",
                  fieldName: "symbol",
                },
              ],
              dateColumn: "timestamp",
              table_name: "futures",
            },
            {
              type: "local-table",
              title: "BNB",
              yAxis: {
                column: "price",
                aggregation: "avg",
              },
              filter: [
                {
                  type: "$eq",
                  value: "BNBUSDT",
                  fieldName: "symbol",
                },
              ],
              dateColumn: "timestamp",
              table_name: "futures",
            },
            {
              type: "local-table",
              title: "SOL",
              yAxis: {
                column: "price",
                aggregation: "avg",
              },
              filter: [
                {
                  type: "$eq",
                  value: "SOLUSDT",
                  fieldName: "symbol",
                },
              ],
              dateColumn: "timestamp",
              table_name: "futures",
            },
            {
              type: "local-table",
              title: "XRP",
              yAxis: {
                column: "price",
                aggregation: "avg",
              },
              filter: [
                {
                  type: "$eq",
                  value: "XRPUSDT",
                  fieldName: "symbol",
                },
              ],
              dateColumn: "timestamp",
              table_name: "futures",
            },
          ],
        },
        {
          id: "price-table",
          sort: [
            {
              asc: false,
              key: "timestamp",
              nulls: "last",
            },
          ],
          type: "table",
          title: "Latest Prices",
          filter: [
            {
              $or: [
                {
                  type: "$eq",
                  value: "BTCUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "ETHUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "BNBUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "SOLUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "XRPUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "LINKUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "AVAXUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "UNIUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "AAVEUSDT",
                  fieldName: "symbol",
                },
                {
                  type: "$eq",
                  value: "DOTUSDT",
                  fieldName: "symbol",
                },
              ],
            },
          ],
          columns: [
            {
              name: "symbol",
              width: 120,
            },
            {
              name: "price",
              width: 140,
              format: {
                type: "Currency",
                params: {
                  mode: "Fixed",
                  currencyCode: "USD",
                  metricPrefix: false,
                },
              },
            },
            {
              name: "timestamp",
              width: 180,
              format: {
                type: "Age",
                params: {
                  variant: "short",
                },
              },
            },
          ],
          cardLayout: {
            type: "container",
            style: {
              gap: "8px",
              display: "flex",
              flexDirection: "column",
            },
            children: [
              {
                type: "node",
                style: {
                  fontSize: "18px",
                  fontWeight: "bold",
                },
                columnName: "symbol",
              },
              {
                type: "container",
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                },
                children: [
                  {
                    type: "node",
                    style: {
                      color: "#2196F3",
                      fontSize: "16px",
                    },
                    columnName: "price",
                  },
                  {
                    type: "node",
                    style: {
                      color: "#999",
                      fontSize: "12px",
                    },
                    columnName: "timestamp",
                  },
                ],
              },
            ],
          },
          table_name: "futures",
        },
      ],
    },
  ],
};
