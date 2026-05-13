import { makeToolUse, type Scenario } from "testAskLLM/utils";

const sql = `WITH o30 AS (
  SELECT o.id,
         o.deliverer_id,
         a.id AS address_id,
         a.postal_code,
         a.country
  FROM orders o
  JOIN addresses a ON a.id = o.customer_address_id::bigint
  WHERE o.created_at >= now() - interval '30 days'
),
normalized AS (
  SELECT id,
         deliverer_id,
         address_id,
         CASE
           WHEN postal_code ~* '^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$' THEN upper(replace(postal_code, ' ', ''))
           WHEN country ~* '^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$' THEN upper(replace(country, ' ', ''))
           ELSE NULL
         END AS full_pc
  FROM o30
),
zone AS (
  SELECT id,
         deliverer_id,
         address_id,
         full_pc,
         CASE WHEN full_pc IS NOT NULL AND length(full_pc) > 3 THEN left(full_pc, length(full_pc)-3) ELSE NULL END AS district
  FROM normalized
),
agg AS (
  SELECT district,
         MIN(address_id) AS sample_address_id,
         COUNT(*) AS orders_30d,
         COUNT(*) FILTER (WHERE deliverer_id IS NULL) AS unassigned_orders_30d,
         COUNT(*) FILTER (WHERE deliverer_id IS NOT NULL) AS assigned_orders_30d,
         COUNT(DISTINCT deliverer_id) FILTER (WHERE deliverer_id IS NOT NULL) AS active_riders_30d
  FROM zone
  WHERE district IS NOT NULL
  GROUP BY district
)
SELECT district,
       sample_address_id,
       orders_30d,
       unassigned_orders_30d,
       ROUND(unassigned_orders_30d::numeric / NULLIF(orders_30d,0), 4) AS unassigned_rate,
       active_riders_30d,
       ROUND(assigned_orders_30d::numeric / NULLIF(active_riders_30d,0), 2) AS assigned_orders_per_rider,
       CASE
         WHEN orders_30d >= 50 AND (unassigned_orders_30d::numeric / NULLIF(orders_30d,0)) >= 0.10 THEN 'low'
         WHEN orders_30d >= 50 AND ROUND(assigned_orders_30d::numeric / NULLIF(active_riders_30d,0), 2) > 8 THEN 'low'
         WHEN orders_30d >= 50 THEN 'ok'
         ELSE 'small_sample'
       END AS coverage_signal
FROM agg
WHERE orders_30d >= 30
ORDER BY unassigned_rate DESC, assigned_orders_per_rider DESC, orders_30d DESC
LIMIT 25;`;

const interpretation = `I checked this using the last **30 days** of orders and a normalized UK postcode extraction (since \`addresses.postal_code\` is often polluted and many postcodes are in \`addresses.country\`).

### Result
With a minimum of **30 orders/zone**, there are currently **no delivery zones showing low rider coverage** under basic coverage signals:

- **Unassigned order rate:** \`0%\` in returned zones  
- **Assigned orders per active rider (zone-level):** roughly \`~1.00–1.03\`

So based on current data, I don’t see a clearly under-covered zone right now.

### Important caveat
Your address data is inconsistent (many rows have \`postal_code='England'\`), so postcode normalization was necessary. This can hide true zone-level imbalance.

---

If you want, I can run a stricter operational definition of “low coverage,” e.g.:
1) high order volume + low unique riders,  
2) high delivery delay (if timestamps/status history allow),  
3) rider-to-order imbalance by hour/daypart.`;

export const geoQuestionScenario: Scenario = {
  firstMessage: "Which delivery zones have low rider coverage?",
  steps: [
    {
      content:
        "I'll quickly check available tools and refresh the live schema so I can identify “delivery zones” accurately and compute rider coverage correctly.",
      tool: [
        makeToolUse("prostgles-ui", "get_tool_list", {}),
        makeToolUse("db", "get_existing_tables_schema", {
          tableNames: [],
          tableNameRegex: "",
        }),
      ],
    },
    {
      content:
        "I'm going to use a better coverage metric: high unassigned-order rate + high orders per active rider, grouped by postcode district (outward code), which is more meaningful than full postcode.",
      tool: [
        makeToolUse("db", "execute_readonly_sql", {
          sql,
        }),
      ],
    },
    {
      content: interpretation,
      tool: [],
      // result_content: interpretation,
    },
  ],
};
