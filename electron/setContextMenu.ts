import { Menu, type BrowserWindow } from "electron";
export const setContextMenu = (mainWindow: BrowserWindow) => {
  mainWindow.webContents.on(
    "context-menu",
    (
      _event,
      { misspelledWord, dictionarySuggestions, isEditable, selectionText },
    ) => {
      const spellCheckMenuItems: Electron.MenuItemConstructorOptions[] = [];

      // Add each spelling suggestion
      for (const suggestion of dictionarySuggestions) {
        spellCheckMenuItems.push({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        });
      }

      // Allow users to add the misspelled word to the dictionary
      if (misspelledWord) {
        spellCheckMenuItems.push({
          label: "Add to dictionary",
          click: () =>
            mainWindow.webContents.session.addWordToSpellCheckerDictionary(
              misspelledWord,
            ),
        });
      }

      const menu = Menu.buildFromTemplate([
        { role: "copy", enabled: Boolean(selectionText) },
        { role: "cut", enabled: Boolean(selectionText) && isEditable },
        { role: "paste", enabled: isEditable },
        { role: "selectAll", enabled: isEditable },
        ...(isEditable ? [{ role: "toggleSpellChecker" } as const] : []),
        { role: "toggleDevTools" },
        ...spellCheckMenuItems,
      ]);
      menu.popup();
    },
  );
};
