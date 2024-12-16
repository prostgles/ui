import React, { useEffect, useRef } from "react";
import { getFileText } from "../W_SQL/W_SQLMenu";
import type { DashboardMenuProps, DashboardMenuState } from "./DashboardMenu";
import { getKeys } from "../../utils";

type P = Pick<DashboardMenuProps, "loadTable"> & {
  setShowSearchAll: React.Dispatch<
    React.SetStateAction<DashboardMenuState["showSearchAll"]>
  >;
};
export const DashboardMenuHotkeys = ({ loadTable, setShowSearchAll }: P) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      const term = window.getSelection()?.toString()?.trim();
      const mode = getHotkey(e);
      if (mode && mode !== "rows" && mode !== "open file") {
        e.preventDefault();
        setShowSearchAll({ mode, term });
      }
    };

    const onKeyUp = (e) => {
      const term = window.getSelection()?.toString()?.trim();
      const mode = getHotkey(e);
      if (mode === "open file") {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.click();
        }
      } else if (mode === "views and queries" || mode === "rows") {
        e.preventDefault();
        setShowSearchAll({ mode, term });
      } else if (e.key === "Escape") {
        setShowSearchAll(undefined);
      }
    };
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [inputRef, setShowSearchAll]);

  const fileSelected: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // if(file.name.toLowerCase().endsWith(".sql")){
      loadTable({ sql: await getFileText(file), type: "sql", name: file.name });
      /* CSV?? */
      // } else {

      // }
    }
  };

  {
    /* Used to CTRL+O open an sql file */
  }
  return (
    <input
      ref={inputRef}
      type="file"
      accept="text/*, .sql, .txt"
      className="hidden"
      onChange={(e) => {
        return fileSelected(e);
      }}
    />
  );
};

const hotkeyCommands = {
  "Ctrl+k": "commands",
  "Ctrl+p": "views and queries",
  "Ctrl+Shift+F": "rows",
  "Ctrl+o": "open file",
} as const;
const getHotkey = (e: KeyboardEvent) => {
  const hotKey = getKeys(hotkeyCommands).find((k) => {
    const keys = k.split("+");
    return keys.every((k) => {
      if (k === "Ctrl") return e.ctrlKey;
      if (k === "Shift") return e.shiftKey;
      return e.key === k;
    });
  });

  return hotKey ? hotkeyCommands[hotKey] : undefined;
};
