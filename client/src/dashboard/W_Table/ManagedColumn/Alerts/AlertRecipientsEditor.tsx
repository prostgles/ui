import {
  getDetailedGroupFilterFromTableFilter,
  getTableFilterFromDetailedGroupFilter,
  type GroupedDetailedFilter,
} from "@common/filterUtils";
import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isEqual, isObject } from "prostgles-types";
import React, { useState } from "react";
import { hasDisabledFilter } from "../../../RenderFilter";
import { AlertFilterEditor } from "./AlertFilterEditor";

export const AlertRecipientsEditor = ({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  const { dbs, dbsTables } = usePrgl();
  const [draft, setDraft] = useState<{
    value: unknown;
    filter: GroupedDetailedFilter;
  }>();
  let filter;
  try {
    filter = getDetailedGroupFilterFromTableFilter(
      isObject(value) ? value : {},
    );
  } catch {
    return <div>Use the JSON tab to edit this custom recipient filter.</div>;
  }
  return (
    <FlexCol>
      <AlertFilterEditor
        label="Recipients"
        emptyLabel="All active users"
        tableName="users"
        filter={draft && isEqual(draft.value, value) ? draft.filter : filter}
        source={{
          db: dbs,
          tables: dbsTables
            .filter(({ name }) => name === "users")
            .map((table) => ({
              ...table,
              columns: table.columns.filter(({ name }) =>
                ["id", "username", "type"].includes(name),
              ),
            })),
        }}
        onChange={(filter) => {
          if (hasDisabledFilter(filter)) {
            setDraft({ value, filter });
            return;
          }
          setDraft(undefined);
          onChange(getTableFilterFromDetailedGroupFilter(filter));
        }}
      />
      <div className="text-1">
        Only active users matching these conditions receive the alert.
      </div>
    </FlexCol>
  );
};
