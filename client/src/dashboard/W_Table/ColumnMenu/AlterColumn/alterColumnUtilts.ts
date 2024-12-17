import type { SQLHandler } from "prostgles-types";

export type ColumnConstraint = {
  constraint_name: string;
  table_name: string;
  column_name: string;
  data_type: string;
  constraint_type: "PRIMARY KEY" | "FOREIGN KEY" | "CHECK" | "UNIQUE";
  delete_rule: string | null;
  update_rule: string | null;
  foreign_table_schema: string | null;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
};

export const getColumnConstraints = (
  tableName: string,
  columnName: string,
  sql: SQLHandler,
): Promise<ColumnConstraint[]> => {
  return sql(
    `
    SELECT DISTINCT 
      trim(constraint_type) as constraint_type, tc.constraint_name,
      tc.table_schema, 
      tc.table_name, 
      kcu.column_name, 
      c.data_type,
      rc.delete_rule,
      rc.update_rule,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.columns AS c 
        ON c.table_schema = tc.table_schema
        AND tc.table_name = c.table_name AND kcu.column_name = c.column_name
      LEFT JOIN information_schema.referential_constraints rc 
        ON rc.constraint_name = tc.constraint_name 
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.table_name = $1 AND c.column_name = $2
  `,
    [tableName, columnName],
    { returnType: "rows" },
  ) as any;
};
