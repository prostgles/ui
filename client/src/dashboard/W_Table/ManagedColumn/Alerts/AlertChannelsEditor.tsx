import { Select } from "@components/Select/Select";
import { usePromise, type DBHandlerClient } from "prostgles-client";
import type { JSONB } from "prostgles-types";
import React from "react";

export const AlertChannelsEditor = ({
  value,
  onChange,
  schema,
  db,
}: {
  value: unknown;
  onChange: (value: string[]) => void;
  schema: JSONB.ValueLookup;
  db: DBHandlerClient;
}) => {
  const channels = usePromise(async () => {
    const rows = await db[schema.table]?.find?.(schema.filter ?? {}, {
      select: [schema.column],
      orderBy: { [schema.column]: 1 },
    });
    return rows?.map((row) => row[schema.column] as string) ?? [];
  }, [db, schema]);

  return (
    <Select
      btnProps={{ variant: "select" }}
      value={value}
      options={channels ?? []}
      multiSelect
      onChange={onChange}
    />
  );
};
