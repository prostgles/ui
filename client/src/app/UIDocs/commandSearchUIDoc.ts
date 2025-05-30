import { UIDocContainers } from "../UIDocs";

export const commandSearchUIDoc = {
  type: "hotkey-popup",
  hotkey: "Ctrl+K",
  title: "Command Search",
  description: "Search for a command",
  selectorCommand: "CommandSearch",
  children: [
    {
      type: "input",
      inputType: "text",
      title: "Search input",
      description: "Type to search for commands, files, and other actions",
      selectorCommand: "SearchAll",
    },
    {
      type: "list",
      title: "Search results",
      description: "List of matching commands and actions",
      selectorCommand: "SearchList.List",
      itemSelector: "[data-key]",
      itemContent: [],
    },
  ],
} satisfies UIDocContainers;
