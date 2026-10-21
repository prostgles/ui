import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { SearchList } from "@components/SearchList/SearchList";
import type { PG_COLUMN_UDT_DATA_TYPE, SQLHandler } from "prostgles-types";
import React, { useState } from "react";

export type SuggestedColumnDataType = {
  table_schema: string;
  table_name: string;
  column_name: string;
  suggested_type: PG_COLUMN_UDT_DATA_TYPE;
  alter_query: string;
};
export const getTextColumnPotentialDataTypes = async (
  sql: SQLHandler,
  { schema, tableName }: { schema?: string; tableName: string },
): Promise<SuggestedColumnDataType[]> => {
  await sql(`ANALYZE \${tableName:name}`, { tableName });
  const q = `
    WITH text_column_values AS (
      SELECT 
        c.table_schema,
        c.table_name,
        c.column_name,
        nullif(common_value, '') as common_value,
        c.udt_name as current_data_type,
        CASE 
          WHEN common_value ~ '^(true|false)$' THEN 'BOOLEAN'
          WHEN common_value ~ '^(0|[1-9][0-9]*)$' THEN 'INTEGER'
          WHEN common_value ~ '^[+-]?[0-9]+([.][0-9]+)?$' THEN 'NUMERIC'
          WHEN common_value ~ '^\\d{4}\\-(0?[1-9]|1[012])\\-(0?[1-9]|[12][0-9]|3[01])$' THEN 'DATE'
          WHEN common_value ~ '[0-9]{1,4}/[0-9]{1,2}/[0-9]{1,2} [0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}' THEN 'TIMESTAMP'
        END AS suggested_type
      FROM pg_stats s
      INNER JOIN information_schema.columns c
        ON s.schemaname = c.table_schema
        AND s.tablename = c.table_name
        AND s.attname = c.column_name
        , unnest(most_common_vals::text::_text) as common_value
      WHERE table_schema = current_schema()
      and table_name = \${tableName}
      and nullif(common_value, '') is not null
    ),
    suggested_types AS (
      SELECT DISTINCT table_schema, table_name, column_name, suggested_type
      , format('ALTER COLUMN %1$I SET DATA TYPE %2$s USING NULLIF(%1$I, '''')::%2$s', column_name, suggested_type) as alter_query
      FROM text_column_values 
    )
    SELECT table_schema, table_name, column_name, MIN(alter_query) as alter_query 
    FROM suggested_types
    WHERE suggested_type IS NOT NULL
  `;

  const result = (await sql(
    q,
    { tableName },
    { returnType: "rows" },
  )) as SuggestedColumnDataType[];
  return result;
};

export const applySuggestedDataTypes = async ({
  types,
  sql,
  tableName,
}: {
  types: SuggestedColumnDataType[];
  sql: SQLHandler;
  tableName: string;
}) => {
  const query =
    `ALTER TABLE ${JSON.stringify(tableName)}\n ` +
    types.map((d) => d.alter_query).join(",\n");
  await sql(query);
};

type P = {
  types: SuggestedColumnDataType[] | undefined;
  onDone: (errors?: any) => void;
  sql: SQLHandler;
  tableName: string;
};

export const ApplySuggestedDataTypes = ({
  types,
  onDone,
  sql,
  tableName,
}: P) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    types?.map((t) => t.column_name) ?? [],
  );
  if (!types?.length) return null;

  return (
    <FlexCol>
      <SearchList
        label="Suggested column data types"
        items={types.map((d) => ({
          key: d.column_name,
          label: d.column_name,
          subLabel: d.suggested_type,
          checked: selectedColumns.includes(d.column_name),
          onPress: () => {
            const newSelected =
              selectedColumns.includes(d.column_name) ?
                selectedColumns.filter((colKey) => colKey !== d.column_name)
              : selectedColumns.concat(d.column_name);
            setSelectedColumns(newSelected);
          },
        }))}
        checkboxed={true}
        onMultiToggle={(selected) => {
          setSelectedColumns(
            selected.filter((d) => d.checked).map((d) => d.key) as string[],
          );
        }}
      />
      <Btn
        color="action"
        variant="filled"
        onClickPromise={async () => {
          const selectedTypes = types.filter((d) =>
            selectedColumns.includes(d.column_name),
          );
          await applySuggestedDataTypes({
            types: selectedTypes,
            sql,
            tableName,
          })
            .then(() => onDone())
            .catch((error) => onDone(error));
        }}
      >
        Apply suggested data types types
      </Btn>
    </FlexCol>
  );
};
