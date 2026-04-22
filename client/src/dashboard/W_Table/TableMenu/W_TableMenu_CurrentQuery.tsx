import React, { useState } from "react";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import CodeExample from "../../CodeExample";
import { getTableFilter } from "../getTableData/getTableFilter";
import { getTableSelect } from "../tableUtils/getTableSelect";
import { getSort } from "../tableUtils/tableUtils";
import type { W_TableMenuProps } from "./W_TableMenu";

const QUERY_TYPES = ["SQL", "Prostgles API", "Full config"] as const;
type QueryType = (typeof QUERY_TYPES)[number];

export const W_TableMenu_CurrentQuery = (props: W_TableMenuProps) => {
  const {
    w,
    prgl: { tables, db },
  } = props;
  const [{ query, type }, setQuery] = useState<{
    query: string;
    type?: QueryType;
  }>({ query: "", type: undefined });

  return (
    <FlexCol>
      {QUERY_TYPES.map((queryType) => {
        const isActive = queryType === type;
        return (
          <Btn
            key={queryType}
            onClickPromise={async () => {
              if (queryType === "Full config") {
                setQuery({
                  query: JSON.stringify(w, null, 2),
                  type: "Full config",
                });
                return;
              }
              const { filter, having } = getTableFilter(w, props);
              const { select } = await getTableSelect(w, tables, db, filter);
              const orderBy = getSort(tables, w);
              let currentQuery = "";
              const selectParams = { select, having, orderBy };
              if (queryType === "SQL") {
                const query = (await db[w.table_name]?.find?.(
                  filter,
                  selectParams,
                  //@ts-ignore
                  { returnQuery: true },
                )) as unknown as string;
                currentQuery = query;
              } else {
                currentQuery = `await db['${w.table_name}'].find(\n  ${JSON.stringify(filter, null, 2)}, \n  ${JSON.stringify(selectParams, null, 2)}\n)`;
              }
              setQuery({ query: currentQuery, type: queryType });
            }}
            variant={isActive ? "filled" : "faded"}
            color="action"
            disabledInfo={isActive ? "Already shown" : undefined}
          >
            {isActive ? "Showing" : "Show"} {queryType} query
          </Btn>
        );
      })}

      {query && (
        <CodeExample
          style={{
            minWidth: "500px",
            minHeight: "500px",
          }}
          language={type === "SQL" ? "sql" : "javascript"}
          value={query}
        />
      )}
    </FlexCol>
  );
};
