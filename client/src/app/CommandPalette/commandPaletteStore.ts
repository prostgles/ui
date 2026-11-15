import type { SearchAllProps } from "src/dashboard/SearchAll/SearchAll";
import { createStore } from "src/hooks/createStore";

type SearchSection = "commands" | "docs" | SearchAllProps["searchType"];

export const commandPaletteStore = createStore<{
  showSection: SearchSection;
  defaultTerm: string | undefined;
  searchAllProps:
    | Omit<SearchAllProps, "onClose" | "leftContent" | "onType">
    | undefined;
}>({
  showSection: undefined,
  defaultTerm: undefined,
  searchAllProps: undefined,
});

export const setShowSection = (
  showSection: SearchSection,
  defaultTerm?: string,
) => {
  commandPaletteStore.setState({ showSection, defaultTerm });
};
