import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise } from "prostgles-client";
import React from "react";
import { fetchSearchResults } from "src/dashboard/SmartForm/SmartFormField/fetchForeignKeyOptions";

export const UserInputColumnValues = ({
  tableName,
  columnName,
  title,
  type,
  optional,
  inputKey,
  inputValue,
  onChange,
}: {
  title: string;
  optional?: boolean;
  type: "table-column-value" | "table-column-values";
  tableName: string;
  columnName: string;
  inputKey: string;
  inputValue: any;
  onChange: (newValue: any) => void;
}) => {
  const { tables, db } = usePrgl();

  const options = usePromise(() => {
    return fetchSearchResults({
      mainColumn: columnName,
      textColumn: undefined,
      db,
      table: tables.find((t) => t.name === tableName)!,
      term: "",
      filter: undefined,
    });
  }, [columnName, db, tables, tableName]);

  return (
    <Select
      label={title}
      multiSelect={type === "table-column-values"}
      optional={optional}
      title={title}
      data-key={inputKey}
      fullOptions={options ?? []}
      value={inputValue}
      onChange={onChange}
    />
  );
};
