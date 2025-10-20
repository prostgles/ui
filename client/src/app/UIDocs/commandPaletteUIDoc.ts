import { getCommandElemSelector } from "src/Testing";
import type { UIDocContainers } from "../UIDocs";

export const commandPaletteUIDoc = {
  type: "hotkey-popup",
  hotkey: ["Ctrl", "K"],
  title: "Command Palette",
  description: "Go to command/action quickly",
  docs: `
    Keyboard-driven navigation to different parts of the application without having to browse through menus or panels. 

    Press <kbd>Ctrl+K</kbd> to open the command palette popup. Type to search through the documentation for functionality, settings, and other sections.
    <img src="./screenshots/command_palette.svgif.svg" alt="Command Palette" />
  `,
  selectorCommand: "CommandPalette",
  children: [
    {
      type: "input",
      inputType: "text",
      title: "Search commands input",
      description: "Type to search for commands and actions",
      selector:
        getCommandElemSelector("CommandPalette") +
        " " +
        getCommandElemSelector("SearchList.Input"),
    },
    {
      type: "list",
      title: "Search results",
      description:
        "List of matching commands and actions. Press Enter to execute/go to the selected command.",
      selector:
        getCommandElemSelector("CommandPalette") +
        " " +
        getCommandElemSelector("SearchList.List"),
      itemSelector: "[data-key]",
      itemContent: [],
    },
  ],
} satisfies UIDocContainers;
