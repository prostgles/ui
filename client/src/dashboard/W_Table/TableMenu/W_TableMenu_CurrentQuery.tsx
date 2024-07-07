import React, { useState } from "react"
import { FlexCol } from "../../../components/Flex";
import Btn from "../../../components/Btn";
import { getTableFilter } from "../getTableData";
import { getTableSelect } from "../tableUtils/getTableSelect";
import { getSort } from "../tableUtils/tableUtils";
import CodeExample from "../../CodeExample";
import type { W_TableMenuProps } from "./W_TableMenu";
import { mdiBug } from "@mdi/js";

const QUERY_TYPES = ["SQL", "Prostgles API", "Debug"] as const;
type QueryType = typeof QUERY_TYPES[number];

export const W_TableMenu_CurrentQuery = (props: W_TableMenuProps) => {
  const { w, prgl: { tables, db } } = props;
  const [{ query, type }, setQuery] = useState<{ query: string; type?: QueryType }>({ query: "", type: undefined })
  // const [queryType, setQueryType] = useState<QueryType>("SQL");

  return <FlexCol>
    {/* <ButtonGroup 
      value={queryType} 
      options={QUERY_TYPES} 
      onChange={currentQueryType => {
        setQuery("");
        setQueryType(currentQueryType);
      }} 
    /> */}
    {QUERY_TYPES.map(queryType => {
      if(queryType === "Debug") return null
      const isActive = queryType === type;
      return <Btn 
        key={queryType}
        onClickPromise={async () => {
          const { filter, having } = getTableFilter(w, props);
          const { select } = await getTableSelect(w, tables, db, filter);
          const orderBy = getSort(tables, w);
          let currentQuery = "";
          const selectParams = { select, having, orderBy }
          if(queryType === "SQL"){
            const query = (await db[w.table_name]?.find?.(
              filter, 
              selectParams, 
              //@ts-ignore
              { returnQuery: true }
            )
            ) as unknown as string;
            currentQuery = query;
          } else {
            currentQuery = `await db['${w.table_name}'].find(\n  ${JSON.stringify(filter, null, 2)}, \n  ${JSON.stringify(selectParams, null, 2)}\n)`
          }
          setQuery({ query: currentQuery, type: queryType })
        }}
        variant={isActive? "filled" : "faded"}
        color="action"
        disabledInfo={isActive? "Already shown" : undefined}
      >
        {isActive? "Showing" : "Show"} {queryType} query
      </Btn>

    })}
    
    {query && 
      <CodeExample
        style={{
          minWidth: "500px",
          minHeight: "500px"
        }}
        language={type === "SQL"? "sql" : "javascript"}
        value={query}
      />
    }

    <Btn 
      iconPath={mdiBug}
      title="Show window object (debugging)" 
      onClick={() => {
        setQuery({ query: JSON.stringify(w, null, 2), type: "Debug" })
      }} 
    />
  </FlexCol>
}
/*

await db['users'].find(
  {}, 
  {
  "select": {
    "id": 1,
    "email": 1,
    "password": 1,
    "first_name": 1,
    "last_name": 1,
    "phone_number": 1,
    "type": 1,
    "location": 1,
    "created_at": 1,
    "customer_id_orders": {
      "$leftJoin": [
        {
          "on": [
            {
              "id": "customer_id"
            }
          ],
          "table": "orders"
        }
      ],
      "filter": { "c": { ">": 0 } },
      "limit": 20,
      "select": {
        "c": {
          "$countAll": []
        }
      },
      "filter": {}
    }
  },
  "limit": 5,
  "orderBy": []
}
)

await db['users'].find(
  {
  "first_name": "Mirta"
}, 
  {
  "select": {
    "id": 1,
    "email": 1,
    "password": 1,
    "first_name": 1,
    "last_name": 1,
    "phone_number": 1,
    "type": 1,
    "location": 1,
    "created_at": 1,
    "deliverer_id_orders": {
      "$leftJoin": [
        {
          "on": [
            {
              "id": "deliverer_id"
            }
          ],
          "table": "orders"
        }
      ],
      "limit": 20,
      "select": {
        "COUNT ALL": {
          "$countAll": []
        }
      },
      "filter": {}
    },
    "customer_id_orders": {
      "$leftJoin": [
        {
          "on": [
            {
              "id": "customer_id"
            }
          ],
          "table": "orders"
        }
      ],
      "limit": 20,
      "select": {
        "COUNT ALL": {
          "$countAll": []
        }
      },
      "filter": {}
    }
  },
  "orderBy": []
}
)

*/