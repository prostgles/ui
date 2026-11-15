import { FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { mdiFilterVariant } from "@mdi/js";
import React from "react";
import type { SearchAllState } from "./hooks/useSearchAllState";

export const SearchAllFooter = ({
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
          iconPath={mdiFilterVariant}
          title="Filter result types"
          limit={1000}
          size="small"
          options={["tables", "queries", "actions"]}
          value={typesToSearch}
          multiSelect={true}
          btnProps={{ variant: "icon" }}
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
            label: [t.schema !== "public" ? t.schema : undefined, t.label]
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
