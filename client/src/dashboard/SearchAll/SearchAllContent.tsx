import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { SearchList } from "@components/SearchList/SearchList";
import React from "react";
import type { SearchAllProps } from "./SearchAll";
import type { SearchAllState } from "./hooks/useSearchAllState";
import { useSearchAllListProps } from "./hooks/useSearchListProps";
import { useSearchTables } from "./hooks/useSearchTables";

export const SearchAllContent = (props: SearchAllProps & SearchAllState) => {
  const {
    defaultTerm,
    tablesToSearch,
    loading,
    matchCase,
    setMatchCase,
    currentSearchedTable,
  } = props;
  const searchRowState = useSearchTables(props);
  const searchListProps = useSearchAllListProps({
    ...props,
    ...searchRowState,
  });

  return (
    <div
      className="flex-row aai-start w-full min-h-0"
      style={{ width: "hh550px", maxWidth: "88vw", alignSelf: "center" }}
    >
      <FlexCol className="min-w-0 min-h-0 f-1">
        <SearchList
          key="search-all-db"
          inputProps={{
            "data-command": "SearchAll",
          }}
          matchCase={{
            value: matchCase,
            onChange: setMatchCase,
          }}
          belowSearchBoxContent={
            !loading ? null : (
              <div
                className={
                  "flex-row w-fit f-0 min-h-0 ai-center h-fit text-1 mx-p5 my-p25 skeleton font-12 gap-p5"
                }
              >
                <Loading sizePx={12} className="f-0" show={loading} />
                <div className="f-1 ta-left ">{`Searching ${currentSearchedTable} (${tablesToSearch.indexOf(currentSearchedTable!) + 1}/${tablesToSearch.length})`}</div>
              </div>
            )
          }
          id="search-all-db"
          className={"f-1 min-w-0 flex-col "}
          searchStyle={{ maxWidth: "500px" }}
          defaultSearch={defaultTerm}
          limit={1000}
          noSearchLimit={0}
          {...searchListProps}
        />
      </FlexCol>
    </div>
  );
};
