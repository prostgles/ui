import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMounted } from "../../../dashboard/BackupAndRestore/CloudStorageCredentialSelector";
import type { SearchListItem, SearchListProps } from "../SearchList";
import { getValueAsText } from "../SearchListContent";

export const useSearchListSearch = (
  props: Pick<
    SearchListProps,
    | "onSearchItems"
    | "searchEmpty"
    | "dataSignature"
    | "onSearch"
    | "onType"
    | "matchCase"
    | "defaultValue"
    | "defaultSearch"
  > & {
    isSearch: boolean | undefined;
  },
) => {
  const [searchTerm, setSearchTerm] = useState("");
  const getIsMounted = useIsMounted();
  const {
    onSearchItems,
    searchEmpty,
    dataSignature,
    onSearch,
    onType,
    isSearch,
    defaultValue,
    defaultSearch,
  } = props;

  const searching = useRef<{
    term: string;
    dataSignature?: string;
    timeout: NodeJS.Timeout;
    cancelCurrentSearch: VoidFunction | undefined;
  }>();

  const [searchState, setSearchState] = useState<{
    searchItems: SearchListItem[];
    searchingItems: boolean;
    searchClosed: boolean;
    error?: any;
    dataSignature?: string;
    term?: string;
  }>({
    searchClosed: true,
    searchingItems: false,
    searchItems: [],
  });
  const searchClosed = searchState.searchClosed;
  const updateSearchState = useCallback(
    (newState: Partial<typeof searchState>) => {
      setSearchState((prevState) => ({
        ...prevState,
        ...newState,
      }));
    },
    [setSearchState],
  );

  const [matchCaseValue, setMatchCaseValue] = useState(
    props.matchCase?.value ?? false,
  );
  const matchCase = props.matchCase?.value ?? matchCaseValue;

  const setSearchClosed = useCallback(
    (closed: boolean) => updateSearchState({ searchClosed: closed }),
    [updateSearchState],
  );
  const endSearch = useCallback(
    (force = false) => {
      if (force || (isSearch && !searchClosed)) {
        searching.current?.cancelCurrentSearch?.();
        setSearchTerm("");
        setSearchClosed(true);
      }
    },
    [isSearch, searchClosed, setSearchClosed],
  );

  const onStartSearch = useCallback(
    (term: string) => {
      if (!onSearchItems) return;

      if (searching.current) {
        if (searching.current.term === term) {
          return;
        } else {
          clearTimeout(searching.current.timeout);
        }
      }

      if (typeof term !== "string" || (!searchEmpty && !term)) {
        updateSearchState({ searchItems: [], searchingItems: false });

        void onSearchItems(term);
      } else {
        updateSearchState({ searchingItems: true });

        searching.current = {
          dataSignature,
          term,
          cancelCurrentSearch: undefined,
          timeout: setTimeout(() => {
            if (!getIsMounted()) return;

            updateSearchState({ searchingItems: true });
            try {
              void onSearchItems(
                term,
                { matchCase },
                (searchItems, finished, cancel) => {
                  if (!searching.current) return;
                  searching.current.cancelCurrentSearch = () => {
                    updateSearchState({
                      searchingItems: false,
                      error: undefined,
                    });
                    cancel();
                    searching.current = undefined;
                  };

                  if (term === searching.current.term) {
                    updateSearchState({
                      searchItems,
                      searchClosed: false,
                      error: undefined,
                      dataSignature,
                      term,
                    });
                    if (finished) {
                      searching.current.cancelCurrentSearch();
                    }
                  }
                },
              );
            } catch (error) {
              updateSearchState({
                searchingItems: false,
                error,
                searchClosed: true,
              });
            }
          }, 400),
        };
      }
    },
    [
      dataSignature,
      getIsMounted,
      matchCase,
      onSearchItems,
      searchEmpty,
      updateSearchState,
    ],
  );

  const onSetTerm = useCallback(
    (
      searchTerm: string,
      e?:
        | React.ChangeEvent<HTMLInputElement>
        | React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
      onType?.(searchTerm, (newTerm) => {
        searchTerm = newTerm;
      });
      setSearchTerm(searchTerm);
      onSearch?.(searchTerm, e);
      onStartSearch(searchTerm);
    },
    [onStartSearch, onSearch, onType],
  );

  useEffect(() => {
    const defaultValueText = getValueAsText(defaultValue);
    if (typeof defaultValueText === "string" && defaultValueText) {
      setSearchTerm(defaultValueText);
    } else if (typeof defaultSearch === "string" && defaultSearch) {
      onSetTerm(defaultSearch, undefined);
    }
  }, [defaultSearch, defaultValue, onSetTerm, setSearchTerm]);

  const setMatchCase = useCallback(
    (value: boolean) => {
      setMatchCaseValue(value);
      updateSearchState({ searchClosed: false });
      if (searchTerm) {
        onStartSearch(searchTerm);
      }
    },
    [onStartSearch, searchTerm, updateSearchState],
  );

  return {
    matchCase,
    setMatchCase,
    onSetTerm,
    searching,
    onStartSearch,
    searchTerm,
    endSearch,
    setSearchClosed,
    ...searchState,
  };
};
export type SearchListState = ReturnType<typeof useSearchListSearch>;
