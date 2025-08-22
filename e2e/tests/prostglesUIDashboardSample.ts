export const prostglesUIDashboardSample = {
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
          y_axis: "count(*)",
          table_name: "orders",
          date_column: "created_at",
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
          y_axis: {
            column: "total_price",
            aggregation: "sum",
          },
          table_name: "orders",
          date_column: "created_at",
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
          geo_column: "location",
          table_name: "v_riders",
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
            tableName: "v_users",
          },
        ],
        isRoot: true,
      },
      windows: [
        {
          id: "restaurant-map",
          type: "map",
          geo_column: "geometry",
          table_name: "london_restaurants.geojson",
        },
        {
          id: "user-map",
          type: "map",
          geo_column: "location",
          table_name: "v_users",
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
                tableName: "v_users",
              },
              {
                id: "customer-orders-chart",
                size: 0.4,
                type: "item",
                viewType: "timechart",
                tableName: "v_users",
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
          table_name: "v_users",
        },
        {
          id: "customer-orders-chart",
          type: "timechart",
          y_axis: "count(*)",
          table_name: "v_users",
          date_column: "created_at",
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
