import type { TablesWithInfo } from "../../DashboardMenu/useTableSizeInfo";

/**
 

given this Typescript tree data structure used for inserting data into postgres:

type InsertData = {
   tableName: string;
   tableInfo: TableInfo;
   row: Record<string, any>;
   nestedInserts?: InsertData[];
}

type TableInfo = {
  name: string;
  columns: {
      name: string;
      is_pkey: boolean;
      references?: { ftable: string; cols: string[]; fcols: string[]; }[]
   };
}

Write a function that will be called from the nested insert row to identify which fields with fixed data because:
1) they are referencing the parent
2) they are referencing a sibling nested record from the parent row 

type getFixedData = (parentRow: InsertData): Record<string, any>


 */

/**
 * Identifies fixed data fields for nested inserts by analyzing parent and sibling references
 * @param parentInsert The parent InsertData object
 * @returns A record of field names and their fixed values
 */
const getFixedData = (parentInsert: InsertData): Record<string, any> => {
  const fixedData: Record<string, any> = {};

  // No need to analyze if there are no nested inserts
  if (!parentInsert.nestedInserts || parentInsert.nestedInserts.length === 0) {
    return fixedData;
  }

  // Get all primary keys from the parent
  const parentPrimaryKeys: Record<string, any> = {};
  parentInsert.tableInfo.columns
    .filter((col) => col.is_pkey)
    .forEach((col) => {
      parentPrimaryKeys[col.name] = parentInsert.row[col.name];
    });

  // Create a map of all sibling tables and their data
  const siblingTablesMap: Record<string, Record<string, any>> = {};
  parentInsert.nestedInserts.forEach((nestedInsert) => {
    const primaryData: Record<string, any> = {};
    nestedInsert.tableInfo.columns
      .filter((col) => col.is_pkey)
      .forEach((col) => {
        primaryData[col.name] = nestedInsert.row[col.name];
      });
    siblingTablesMap[nestedInsert.tableName] = {
      ...nestedInsert.row,
      ...primaryData,
    };
  });

  // For each column in each nested insert, check if it references the parent or a sibling
  parentInsert.nestedInserts.forEach((nestedInsert) => {
    nestedInsert.tableInfo.columns.forEach((column) => {
      if (column.references && column.references.length > 0) {
        column.references.forEach((reference) => {
          // Case 1: Column references the parent table
          if (reference.ftable === parentInsert.tableName) {
            for (let i = 0; i < reference.cols.length; i++) {
              const localCol = reference.cols[i];
              const foreignCol = reference.fcols[i]!;
              if (parentInsert.row[foreignCol] !== undefined) {
                if (!fixedData[nestedInsert.tableName]) {
                  fixedData[nestedInsert.tableName] = {};
                }
                fixedData[nestedInsert.tableName][localCol!] =
                  parentInsert.row[foreignCol];
              }
            }
          }

          // Case 2: Column references a sibling table
          else if (siblingTablesMap[reference.ftable]) {
            for (let i = 0; i < reference.cols.length; i++) {
              const localCol = reference.cols[i]!;
              const foreignCol = reference.fcols[i];
              if (
                siblingTablesMap[reference.ftable]![foreignCol!] !== undefined
              ) {
                if (!fixedData[nestedInsert.tableName]) {
                  fixedData[nestedInsert.tableName] = {};
                }
                fixedData[nestedInsert.tableName][localCol] =
                  siblingTablesMap[reference.ftable]![foreignCol!];
              }
            }
          }
        });
      }
    });
  });

  return fixedData;
};

type InsertData = {
  tableName: string;
  tableInfo: TablesWithInfo[number];
  row: Record<string, any>;
  nestedInserts?: InsertData[];
};
