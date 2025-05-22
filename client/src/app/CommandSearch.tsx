import React, { useCallback, useEffect, useState } from "react";
import Popup from "../components/Popup/Popup";
import SearchList from "../components/SearchList/SearchList";
import { flatDocs, type UIDocContainers, type UIDocElement } from "./UIDocs";
import Markdown from "react-markdown";
import { FlexCol } from "../components/Flex";
import { useNavigate } from "react-router-dom";
import { click, waitForElement } from "../demo/demoUtils";

/**
 * By pressing Ctrl+K, the user to search and go to functionality in the UI.
 */
export const CommandSearch = () => {
  const navigate = useNavigate();
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

  const goToUI = useCallback(
    async (doc: UIDocContainers | UIDocElement) => {
      if (doc.type === "page") {
        const { pathname } = window.location;
        const path = `/${doc.path}`;
        let isOnPage = pathname.startsWith(path);
        if (doc.pathItem) {
          const currentPathItem = pathname
            .slice(path.length + 1)
            .split("/")
            .pop();
          isOnPage = isOnPage && !!currentPathItem;
        }
        if (!isOnPage) {
          navigate(path);
        }
      } else if (
        doc.type === "popup" ||
        doc.type === "tab" ||
        doc.type === "accordion-item" ||
        doc.type === "link" ||
        doc.type === "smartform-popup"
      ) {
        await click("", doc.selector);
      } else {
        const elem = await waitForElement<HTMLDivElement>("", doc.selector);
        elem.focus();
      }
    },
    [navigate],
  );

  if (!open) return null;
  return (
    <Popup
      title={open === "commands" ? undefined : "Documentation"}
      clickCatchStyle={{ opacity: 1 }}
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
            onPress: async () => {
              console.log("Selected:", data);
              const page = data.parentDocs[0] ?? data;
              if (page.type !== "page") {
                console.warn("Selected item is not a page");
                return;
              }
              await goToUI(page);
              const prevParents = data.parentDocs.slice(1);
              for (const parent of prevParents) {
                await goToUI(parent);
              }
              await goToUI(data);
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
