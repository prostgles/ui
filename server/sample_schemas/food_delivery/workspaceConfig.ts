export const workspaceConfig = {
  workspaces: [
    {
      name: "Main",
      options: {
        hideCounts: false,
        pinnedMenu: true,
        tableListSortBy: "extraInfo",
        tableListEndInfo: "count",
        defaultLayoutType: "tab",
      },
      windows: [
        {
          type: "sql",
          name: "Stats",
          sql: `/* Most popular menu items */
SELECT mi.name, COUNT(*) as order_count
FROM order_items oi
LEFT JOIN menu_items mi
  ON mi.id = oi.menu_item_id
LEFT JOIN orders o
  ON o.id = oi.order_id
GROUP BY 1
ORDER BY 2 desc

/* Busiest delivery times */
SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as order_count
FROM orders
GROUP BY hour
ORDER BY order_count DESC

/* Top-performing restaurants */
SELECT restaurants.name, SUM(orders.total_price) as total_revenue
FROM orders
JOIN restaurants ON orders.restaurant_id = restaurants.id
GROUP BY restaurants.id, restaurants.name
ORDER BY total_revenue DESC
LIMIT 10;

/* Customer retention rate */
WITH customer_orders AS (
  SELECT customer_id, MIN(created_at) as first_order, MAX(created_at) as last_order
  FROM orders
  GROUP BY customer_id
)
SELECT 
  (COUNT(CASE WHEN last_order >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' THEN 1 END) * 100.0 / COUNT(*))::NUMERIC(8,2) as retention_rate
FROM customer_orders;`,
        },
      ],
    },
  ],
};
