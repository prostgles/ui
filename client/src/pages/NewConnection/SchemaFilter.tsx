import FormField from "@components/FormField/FormField";
import { Select, type SelectProps } from "@components/Select/Select";
import { usePromise, type SQLHandler } from "prostgles-client";
import React, { useMemo } from "react";
import { t } from "../../i18n/i18nUtils";
import type { Connection } from "./NewConnectionForm";

type P = Pick<Connection, "db_schema_filter"> & {
  sql: SQLHandler | undefined;
  onChange: (newSchemaFilter: Connection["db_schema_filter"]) => void;
  asSelect:
    | Pick<
        SelectProps<string, true>,
        "asRow" | "btnProps" | "className" | "label"
      >
    | undefined;
};

export const SchemaFilter = ({
  sql,
  db_schema_filter,
  onChange,
  asSelect,
}: P) => {
  const schemas = usePromise(async () => {
    if (!sql) return;

    const schemas = (await sql(
      `
        SELECT schema_name, schema_owner
        FROM information_schema.schemata
        ORDER BY (
          CASE WHEN schema_name = 'public' THEN '0' 
            WHEN schema_owner = 'postgres' THEN 'b' 
            ELSE 'a' 
          END
        ) || schema_name
        `,
      {},
      { returnType: "rows" },
    )) as { schema_name: string; schema_owner: string }[];
    return schemas;
  }, [sql]);

  const commonProps = useMemo(() => {
    const value = db_schema_filter || { public: 1 };
    const selectedNames = Object.keys(value);

    return {
      id: "schema_filter",
      label: t.NewConnectionForm["Schemas"],
      multiSelect: true,
      "data-command": "NewConnectionForm.schemaFilter",
      fullOptions:
        schemas?.map((s) => ({
          key: s.schema_name,
          subLabel: s.schema_owner,
          disabledInfo:
            s.schema_name === "prostgles" ? "Not allowed" : undefined,
        })) ?? [],
      value: selectedNames,
      disabledInfo:
        !schemas ?
          t.NewConnectionForm["Must connect to see schemas"]
        : undefined,
      onChange: (selectedKeys: string[] | undefined) => {
        const newSchemaFilter =
          !selectedKeys ?
            { public: 1 }
          : selectedKeys.reduce(
              (acc, key) => ({
                ...acc,
                [key]: Object.values(value).includes(1) ? 1 : 0,
              }),
              {},
            );
        onChange(newSchemaFilter);
      },
    } satisfies SelectProps<string, true>;
  }, [db_schema_filter, onChange, schemas]);

  if (asSelect) {
    return <Select {...commonProps} {...asSelect} />;
  }

  return <FormField {...commonProps} />;
};
