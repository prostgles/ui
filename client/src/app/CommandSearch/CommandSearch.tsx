import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isObject } from "../../../../commonTypes/publishUtils";
import { getCommandElemSelector, type Command } from "../../Testing";
import Popup from "../../components/Popup/Popup";
import SearchList from "../../components/SearchList/SearchList";
import { includes } from "../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { click, waitForElement } from "../../demo/demoUtils";
import { tout } from "../../utils";
import { flatDocs, type UIDoc } from "../UIDocs";
import { Documentation } from "./Documentation";
import { FlashMessage } from "../../components/FlashMessage";

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

  const [message, setMessage] = useState<{
    text: string;
    left: number;
    top: number;
  }>();
  const showList = useCallback(
    (doc: Extract<UIDoc, { type: "page" | "list" }>) => {
      const [firstItem] = highlightListItems(doc);
      if (!firstItem) {
        alert("No items found in the list.");
        return;
      }
      const { left, top } = firstItem.getBoundingClientRect();
      setMessage({ text: "Press item from list", left, top: top - 30 });
      setTimeout(() => {
        setMessage(undefined);
      }, 3000);
    },
    [],
  );
  const goToUI = useCallback(
    async (doc: UIDoc) => {
      if (doc.type === "page" || doc.type === "navbar") {
        const { isOnPage, paths } = getDocPagePath(doc);
        if (!isOnPage) {
          navigate(paths[0]!);
          if (doc.type === "page" && doc.pathItem) {
            await tout(400);
            showList(doc);
          }
        }
        if (doc.type === "navbar") {
          await focusElement(doc.selectorCommand ?? "", doc.selector);
        }
      } else if (doc.type === "list") {
        showList(doc);
      } else if (
        doc.type === "popup" ||
        doc.type === "tab" ||
        doc.type === "accordion-item" ||
        doc.type === "link" ||
        doc.type === "smartform-popup"
      ) {
        await click(doc.selectorCommand ?? "", doc.selector);
      } else {
        await focusElement(doc.selectorCommand ?? "", doc.selector);
      }
    },
    [navigate, showList],
  );

  if (message) {
    return (
      <FlashMessage {...message} onFinished={() => setMessage(undefined)} />
    );
  }
  if (!open) return null;
  return (
    <Popup
      title={open === "commands" ? undefined : "Documentation"}
      data-command="CommandSearch"
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
              setOpen(undefined);
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
      : <Documentation />}
    </Popup>
  );
};

const focusElement = async (testId: Command | "", endSelector?: string) => {
  const elem = await waitForElement<HTMLDivElement>(testId, endSelector);
  elem.focus();
};
const highlightListItems = (doc: Extract<UIDoc, { type: "page" | "list" }>) => {
  const selectors = doc.type === "page" ? doc.pathItem : doc;
  const { selectorCommand, selector = "" } = selectors ?? {};
  const listItems = document.querySelectorAll<HTMLDivElement>(
    (selectorCommand ? getCommandElemSelector(selectorCommand) : "") + selector,
  );
  listItems.forEach((el) => {
    el.style.border = "2px solid var(--text-warning)";
  });
  return Array.from(listItems);
};

const PATH_JOIN_CHARS = ["/", "#", "?"] as const;
const getDocPagePath = (doc: Extract<UIDoc, { type: "page" | "navbar" }>) => {
  const paths = doc.type === "page" ? [doc.path] : doc.paths;
  const { pathname } = window.location;
  const matchedPage = paths.find((pathWopts) => {
    const path = isObject(pathWopts) ? pathWopts.route : pathWopts;
    const exact = isObject(pathWopts) && pathWopts.exact;
    if (exact) {
      return pathname === path;
    }
    const endChar = pathname[path.length];
    return (
      pathname.startsWith(path) &&
      (!endChar || includes(endChar, PATH_JOIN_CHARS))
    );
  });
  let isOnPage = !!matchedPage;
  if (matchedPage && doc.type === "page" && doc.pathItem) {
    const matchedPagePath =
      isObject(matchedPage) ? matchedPage.route : matchedPage;
    const currentPathItem = pathname
      .slice(matchedPagePath.length + 1)
      .split(`/[${PATH_JOIN_CHARS.join("")}]/`)
      .pop();
    isOnPage = isOnPage && !!currentPathItem;
  }
  return {
    isOnPage,
    matchedPage,
    paths: paths.map((pathWopts) =>
      isObject(pathWopts) ? pathWopts.route : pathWopts,
    ),
  };
};
