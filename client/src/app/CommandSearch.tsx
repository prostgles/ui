import React, { useEffect, useState } from "react";
import Popup from "../components/Popup/Popup";
import SearchList from "../components/SearchList/SearchList";
import { flatDocs } from "./UIDocs";
import Markdown from "react-markdown";
import { FlexCol } from "../components/Flex";

/**
 * By pressing Ctrl+K, the user can open a command search dialog.
 * This dialog allows the user to search and execute commands within the current context
 */
export const CommandSearch = () => {
  const [open, setOpen] = useState<"commands" | "docs">();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        setOpen("docs");
      }
      if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        setOpen("commands");
      }
      if (event.key === "Escape") {
        setOpen(undefined);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;
  return (
    <Popup
      title={open === "commands" ? undefined : "Documentation"}
      clickCatchStyle={{ opacity: 0.5 }}
      positioning={open === "commands" ? "top-center" : "fullscreen"}
      onClose={() => setOpen(undefined)}
      contentClassName="flex-col gap-2 p-1"
      contentStyle={
        open === "docs" ?
          {
            textAlign: "left",
          }
        : {
            width: "min(100vw, 700px)",
            maxHeight: "min(100vh, 500px)",
          }
      }
    >
      {open === "commands" ?
        <SearchList
          placeholder="Search actions..."
          autoFocus={true}
          items={flatDocs.map((data) => ({
            key: data.parentTitles.join(" > ") + " > " + data.title,
            subLabel: data.description,
            onPress: () => {
              console.log("Selected:", data);
            },
            data,
          }))}
        />
      : <FlexCol>
          <Markdown>{documentation}</Markdown>
          <img src="/hehe3.svg" alt="PostgreSQL logo" />
        </FlexCol>
      }
    </Popup>
  );
};

const documentation = flatDocs
  .map((doc) => {
    const title = `${"#".repeat(doc.parentTitles.length + 1)} ${doc.title}`;
    return [title, doc.description].join("\n\n");
  })
  .join("\n\n");
