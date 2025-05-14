import React, { useEffect, useMemo, useState } from "react";
import Popup from "../components/Popup/Popup";
import FormField from "../components/FormField/FormField";
import { fixIndent } from "../demo/sqlVideoDemo";
import Markdown from "react-markdown";
import SearchList from "../components/SearchList/SearchList";
import { dataCommand, getCommandElemSelector } from "../Testing";
import { flatDocs } from "./UIDocs";

/**
 * By pressing Ctrl+K, the user can open a command search dialog.
 * This dialog allows the user to search and execute commands within the current context
 */
export const CommandSearch = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const results = useMemo(() => {
    return ["docs"]
      .map((d) => {
        const matchIndex =
          !search.trim() ? -1 : d.toLowerCase().indexOf(search.toLowerCase());
        const LENGTH = 100;
        const highlightedContent =
          matchIndex === -1 ? undefined : (
            [
              "..." + d.slice(Math.max(0, matchIndex - LENGTH), matchIndex),
              "**" + d.slice(matchIndex, matchIndex + search.length) + "**",
              d.slice(
                matchIndex + search.length,
                matchIndex + search.length + LENGTH,
              ) + "...",
            ].join("")
          );
        return {
          content: highlightedContent || d,
          matchIndex,
          highlightedContent,
        };
      })
      .filter(({ matchIndex }) => matchIndex !== -1)
      .sort((a, b) => {
        return a.matchIndex - b.matchIndex;
      });
  }, [search]);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        setOpen(!open);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  flatDocs;

  if (!open) return null;
  return (
    <Popup
      clickCatchStyle={{ opacity: 0.5 }}
      positioning="top-center"
      rootChildClassname="shadow-xl"
      onClose={() => setOpen(false)}
      // autoFocusFirst={{ selector: "input" }}
      contentClassName="flex-col gap-2 p-1 max-w-700"
    >
      <FormField
        placeholder="Search actions..."
        value={search}
        onChange={setSearch}
        wrapperStyle={{ minWidth: "min(90vw, 600px)", maxWidth: "100%" }}
      />
      <SearchList
        autoFocus={true}
        items={[{ key: "hehe", subLabel: "hoho" }]}
      />
      {results.map(({ content }, index) => (
        <Markdown key={index} className={"Marked min-w-0 max-w-full"}>
          {content}
        </Markdown>
      ))}
    </Popup>
  );
};

// const getPage = <
//   PageName extends string,
//   Children extends Record<string, UIContainers>,
// >(
//   pageName: PageName,
//   children: Children,
// ): Record<PageName, { type: "page"; children: Children }> => ({
//   [pageName as PageName]: {
//     type: "page" as const,
//     children,
//   } ,
// });

// const flattenedDocs = Object.entries(docsMap).reduce((acc, [key, value]) => {
//   const flattened = Object.entries(value).reduce((acc, [subKey, subValue]) => {
//     return acc.concat(
//       subValue.map((item) => ({
//         ...item,
//         key: `${key}.${subKey}.${item.key}`,
//       })),
//     );
//   }, []);
//   return acc.concat(flattened);
// }
