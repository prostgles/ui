import { getSuggestions } from "../../SmartForm/SmartFormField/fieldUtils";
import { getSmartGroupFilter, type BaseFilterProps } from "../smartFilterUtils";

type Args = Pick<
  BaseFilterProps,
  "db" | "column" | "tableName" | "tables" | "otherFilters"
> & {
  term: string;
};
export const fetchListFilterOptions = async (args: Args) => {
  const { db, column, tableName, tables, otherFilters, term } = args;

  /** Will render $in $nin filter */
  let finalTableName = tableName;
  const isTableColumn = column.type === "column";
  const firstReference = isTableColumn ? column.references?.[0] : undefined;
  let finalColumnName = column.name;
  let isReference = false;
  if (firstReference) {
    finalTableName = firstReference.ftable;
    finalColumnName = firstReference.fcols[0] || finalColumnName;
    isReference = true;
  }
  let groupBy = true; // !isReference;

  if (finalTableName && db[finalTableName]?.find) {
    let finalColumn = column;
    if (isTableColumn) {
      const tableColumn = tables
        .find((t) => t.name === finalTableName)
        ?.columns.find((c) => c.name === finalColumnName);
      if (!tableColumn) throw new Error("Column not found: " + finalColumnName);
      if (tableColumn.udt_name === "jsonb") groupBy = false;
      finalColumn = {
        type: "column",
        ...tableColumn,
      };
    }

    const filter = getSmartGroupFilter(otherFilters);
    /**
     * If this is a foreign key column then we search the foreign table
     */
    const finalFilter =
      isReference ?
        {
          $existsJoined: {
            path: [tableName],
            filter,
          },
        }
      : filter;
    const rawOptions = await getSuggestions({
      db,
      column: finalColumn,
      table: finalTableName,
      term,
      groupBy,
      filter: finalFilter,
    });

    if (
      isTableColumn &&
      isReference &&
      column.is_nullable &&
      !rawOptions.includes(null)
    ) {
      rawOptions.unshift(null);
    }

    return { options: rawOptions };
  }

  return { options: [] };
};
