import type { UIDocContainers } from "../UIDocs";

export const commandSearchUIDoc = {
  type: "hotkey-popup",
  hotkey: "Ctrl+K",
  title: "Command Search",
  description: "Search and go to command/action quickly",
  docs: `
    Go to any command or action by using the command search feature. 
    This allows you to quickly navigate to different parts of the application without having to browse through menus or panels.

    Press <kbd>Ctrl+K</kbd> to open the command search popup. Type to search for commands, files, and other actions.
    <img src="/screenshots/command_search.svg" alt="Command Search" />
  `,
  selectorCommand: "CommandSearch",
  children: [
    {
      type: "input",
      inputType: "text",
      title: "Search commands input",
      description: "Type to search for commands, files, and other actions",
      selectorCommand: "SearchAll",
    },
    {
      type: "list",
      title: "Search results",
      description:
        "List of matching commands and actions. Press Enter to execute/go to the selected command.",
      selectorCommand: "SearchList.List",
      itemSelector: "[data-key]",
      itemContent: [],
    },
  ],
} satisfies UIDocContainers;
