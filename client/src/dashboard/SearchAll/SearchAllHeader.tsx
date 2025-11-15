import ButtonGroup from "@components/ButtonGroup";
import { FlexRow, FlexRowWrap } from "@components/Flex";
import { Select } from "@components/Select/Select";
import React from "react";
import type { SearchAllState } from "./hooks/useSearchAllState";

export const SEARCH_TYPES = [
  { key: "views and queries", label: "Tables/Queries" },
  { key: "rows", label: "Data" },
] as const;

export const SearchAllHeader = ({
  setTablesToSearch,
  tablesToSearch,
  setTypesToSearch,
  typesToSearch,
  tablesAndViews,
  mode,
  setMode,
}: SearchAllState) => {
  return (
    <FlexRow>
      <div className="font-18 fw-600">Quick search</div>
      <FlexRowWrap className="font-16 font-normal">
        <ButtonGroup
          size="small"
          className="o-auto"
          options={SEARCH_TYPES.map((s) => s.label)}
          value={SEARCH_TYPES.find((s) => s.key === mode)?.label}
          onChange={(sLabel) => {
            const newMode = SEARCH_TYPES.find((s) => s.label === sLabel)?.key;
            if (newMode) {
              setMode(newMode);
            }
          }}
        />

        {mode !== "rows" ?
          <Select
            label="Tables/Queries/Actions"
            limit={1000}
            asRow={true}
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
    </FlexRow>
  );
};
