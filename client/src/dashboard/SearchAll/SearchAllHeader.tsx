import { FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import React from "react";
import type { SearchAllState } from "./hooks/useSearchAllState";

export const SearchAllHeader = ({
  setTablesToSearch,
  tablesToSearch,
  setTypesToSearch,
  typesToSearch,
  tablesAndViews,
  mode,
}: SearchAllState) => {
  return (
    <FlexRowWrap className="font-16 font-normal">
      {mode !== "rows" ?
        <Select
          label="Tables/Queries/Actions"
          limit={1000}
          asRow={true}
          style={{ flexWrap: "wrap" }}
          size="small"
          options={["tables", "queries", "actions"]}
          value={typesToSearch}
          multiSelect={true}
          btnProps={{ style: { maxWidth: "250px" } }}
          onChange={setTypesToSearch}
        />
      : <Select
          label="Tables"
          limit={1000}
          asRow={true}
          style={{ flexWrap: "wrap" }}
          size="small"
          fullOptions={tablesAndViews.map((t) => ({
            key: t.name,
            label: [t.schema !== "public" ? t.schema : undefined, t.name]
              .filter(Boolean)
              .join("."),
            subLabel: t.subLabel,
          }))}
          value={tablesToSearch}
          multiSelect={true}
          btnProps={{ style: { maxWidth: "250px" } }}
          onChange={setTablesToSearch}
        />
      }
    </FlexRowWrap>
  );
};
