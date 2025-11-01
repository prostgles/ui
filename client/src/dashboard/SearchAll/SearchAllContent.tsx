import { FlexCol } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { SearchList } from "@components/SearchList/SearchList";
import React from "react";
import type { SearchAllProps } from "./SearchAll";
import type { SearchAllState } from "./useSearchAllState";
import { useSearchAllListProps } from "./useSearchListProps";
import { useSearchAllRows } from "./useSearchAllRows";

export const SearchAllContent = (props: SearchAllProps & SearchAllState) => {
  const {
    defaultTerm,
    tablesToSearch,
    loading,
    matchCase,
    setMatchCase,
    currentSearchedTable,
  } = props;
  const searchRowState = useSearchAllRows(props);
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
        {loading && (
          <div className={"flex-row f-0 min-h-0 ai-center h-fit "}>
            <Loading sizePx={18} className="f-0 m-p5" show={loading} />
            <div className="f-1 ta-left font-14">{`Searching ${currentSearchedTable} (${tablesToSearch.indexOf(currentSearchedTable!) + 1}/${tablesToSearch.length})`}</div>
          </div>
        )}
        <SearchList
          key="search-all-db"
          inputProps={{
            "data-command": "SearchAll",
          }}
          matchCase={{
            value: matchCase,
            onChange: setMatchCase,
          }}
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
