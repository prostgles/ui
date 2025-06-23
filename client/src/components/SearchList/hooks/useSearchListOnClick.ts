import { useEffect } from "react";
import type { useSearchListSearch } from "./useSearchListSearch";

type P = {
  isSearch: boolean | undefined;
  refList: React.RefObject<HTMLUListElement>;
  refInput: React.RefObject<HTMLInputElement>;
  dataSignature: string | undefined;
} & Pick<
  ReturnType<typeof useSearchListSearch>,
  "onStartSearch" | "searching" | "searchClosed" | "setSearchClosed"
>;
export const useSearchListOnClick = (props: P) => {
  const {
    isSearch,
    onStartSearch,
    searching,
    searchClosed,
    refList,
    dataSignature,
    refInput,
    setSearchClosed,
  } = props;

  useEffect(() => {
    /** Toggle search items when clicking the input */
    const onClick: EventListenerOrEventListenerObject = (e) => {
      const {
        dataSignature: searchedDataSignature,
        term,
        cancelCurrentSearch,
      } = searching.current ?? {};
      if (isSearch && refList.current && e.target) {
        if (
          !searchClosed &&
          !refList.current.contains(e.target as Node) &&
          !refInput.current?.contains(e.target as Node)
        ) {
          setSearchClosed(true);
          cancelCurrentSearch?.();
        } else if (
          searchClosed &&
          refInput.current &&
          refInput.current.contains(e.target as Node)
        ) {
          if (term && searchedDataSignature !== dataSignature) {
            onStartSearch(term);
          } else {
            setSearchClosed(false);
          }
        }
      }
    };

    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
    };
  }, [
    dataSignature,
    isSearch,
    onStartSearch,
    refInput,
    refList,
    searchClosed,
    searching,
    setSearchClosed,
  ]);
};
