import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { SearchListProps } from "../SearchList";

export const SEARCH_LIST_INPUT_CLASSNAME = "search-list-comp-input";

export type SearchListOnKeyUpDownProps = Pick<
  SearchListProps,
  "onPressEnter"
> & {
  refInput: React.RefObject<HTMLInputElement>;
  refList: RefObject<HTMLUListElement>;
  searchTerm: string | undefined;
  endSearch: (force?: boolean) => void;
};
export const useSearchListOnKeyUpDown = ({
  refList,
  refInput,
  onPressEnter,
  endSearch,
  searchTerm,
}: SearchListOnKeyUpDownProps) => {
  const focusedRowIndexRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    focusedRowIndexRef.current = undefined;
  }, [searchTerm]);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const list = refList.current;
      const input = refInput.current;
      if (!list) return;
      const { activeElement } = document;
      if (!activeElement || !e.currentTarget.contains(document.activeElement))
        return;
      const listItems = [...list.children].filter(
        (el) => el instanceof HTMLLIElement,
      );
      const firstListItem = listItems.at(0);
      const lastListItem = listItems.at(-1);

      const listNotFocused = !list.contains(activeElement);

      const inputIsFocused = !!activeElement.closest(
        "." + SEARCH_LIST_INPUT_CLASSNAME,
      );

      /* Prevent annoying select all when not within input */
      if (e.key === "a" && e.ctrlKey && !inputIsFocused) {
        input?.focus();
        input?.select();
        e.preventDefault();
        return;
      }

      if (e.key === "Enter" && inputIsFocused) {
        e.preventDefault();
        if (
          onPressEnter &&
          focusedRowIndexRef.current === undefined &&
          searchTerm
        ) {
          onPressEnter(searchTerm);
          endSearch(true);
        } else if (firstListItem) {
          firstListItem.click();
        }
      }

      if (
        !listNotFocused &&
        e.key.length === 1 &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        input?.focus();
        return;
      }

      if (e.key === "ArrowUp") {
        if (activeElement === firstListItem || listNotFocused) {
          lastListItem?.focus();
        } else if (listItems.length && activeElement instanceof HTMLLIElement) {
          listItems[listItems.indexOf(activeElement) - 1]?.focus();
        }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (activeElement === lastListItem || listNotFocused) {
          firstListItem?.focus();
        } else if (listItems.length && activeElement instanceof HTMLLIElement) {
          listItems[listItems.indexOf(activeElement) + 1]?.focus();
        }
        e.preventDefault();
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        focusedRowIndexRef.current =
          activeElement instanceof HTMLLIElement ?
            listItems.indexOf(activeElement)
          : -1;
      }
    },
    [endSearch, onPressEnter, refInput, refList, searchTerm],
  );

  return { onKeyDown };
};
