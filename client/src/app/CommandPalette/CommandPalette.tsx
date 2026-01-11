import { FlashMessage } from "@components/FlashMessage";
import { Icon } from "@components/Icon/Icon";
import Popup from "@components/Popup/Popup";
import { SearchList } from "@components/SearchList/SearchList";
import {
  mdiArrowSplitVertical,
  mdiButtonPointer,
  mdiCardTextOutline,
  mdiChartLine,
  mdiCheckboxOutline,
  mdiFileUploadOutline,
  mdiFormatListBulleted,
  mdiFormSelect,
  mdiFormTextbox,
  mdiKeyboard,
  mdiLink,
  mdiListBoxOutline,
  mdiMenu,
  mdiNumeric,
  mdiTextLong,
} from "@mdi/js";
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { flatUIDocs, type UIDoc, type UIDocInputElement } from "../UIDocs";
import "./CommandPalette.css";
import { Documentation } from "./Documentation";
import { useGoToUI } from "./useGoToUI";
import { getItemSearchRank } from "@components/SearchList/searchMatchUtils/getItemSearchRank";
import { isPlaywrightTest } from "src/i18n/i18nUtils";
import { getProperty } from "@common/utils";

/**
 * By pressing Ctrl+K, the user to search and go to functionality in the UI.
 */
export const CommandPalette = ({ isElectron }: { isElectron: boolean }) => {
  const { showSection, setShowSection } = useOnKeyDown();
  const [highlights, setHighlights] = useState<CommandSearchHighlight[]>([]);
  const { message, setMessage, goToUIDocItem } = useGoToUI(setHighlights);

  return (
    <>
      {highlights.map((h, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            zIndex: 9999,
            left: `${h.left}px`,
            top: `${h.top}px`,
            width: `${h.width}px`,
            height: `${h.height}px`,
            background: "var(--active-hover)",
            borderRadius: h.borderRadius,
            pointerEvents: "none",
            touchAction: "none",
          }}
          className={
            "CommandPalette_Highlighter " +
            (h.flickerSlow ? "flicker-slow" : "flicker")
          }
        />
      ))}
      {message ?
        <FlashMessage {...message} onFinished={() => setMessage(undefined)} />
      : showSection && (
          <Popup
            key={showSection}
            title={
              showSection === "commands" ? undefined : (
                <NavLink to={"/documentation"}>Documentation</NavLink>
              )
            }
            data-command="CommandPalette"
            clickCatchStyle={{ opacity: 1 }}
            positioning={showSection === "commands" ? "top-center" : "center"}
            onClose={() => setShowSection(undefined)}
            contentClassName={
              "flex-col gap-2 " + (showSection === "docs" ? " p-2" : "p-1")
            }
            contentStyle={
              showSection === "docs" ?
                {
                  textAlign: "left",
                }
              : {
                  width: "min(100vw, 700px)",
                  maxHeight: "min(100vh, 500px)",
                }
            }
          >
            {showSection === "commands" ?
              <SearchList
                placeholder="Search actions..."
                autoFocus={true}
                limit={100}
                items={flatUIDocs.map((data) => {
                  const iconKey =
                    data.type === "input" ?
                      `${data.type}-${data.inputType}`
                    : data.type;
                  const iconPath =
                    data.iconPath ?? getProperty(UIDocTypeToIcon, iconKey);
                  if (!iconPath) {
                    console.warn("No icon for UIDoc type", iconKey, data);
                  }
                  return {
                    key: data.title,
                    parentLabels: data.parentTitles,
                    label: data.title,
                    subLabel: data.description,
                    contentLeft:
                      iconPath ?
                        <Icon
                          path={iconPath}
                          title={data.type}
                          className="text-1 f-0"
                        />
                      : undefined,
                    onPress: async () => {
                      setShowSection(undefined);
                      await goToUIDocItem(data);
                    },
                    ranking: (searchTerm) =>
                      getItemSearchRank(
                        {
                          title: data.title,
                          subTitle: data.description,
                          level: data.parentTitles.length,
                        },
                        searchTerm,
                      ),
                    data,
                  };
                })}
              />
            : <Documentation isElectron={isElectron} />}
          </Popup>
        )
      }
    </>
  );
};

export type CommandSearchHighlight = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: string;
  flickerSlow?: boolean;
};

const useOnKeyDown = () => {
  const [showSection, setShowSection] = useState<"commands" | "docs">();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        setShowSection("docs");
      }
      if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        setShowSection("commands");
      }
      if (event.key === "Escape") {
        setShowSection(undefined);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSection]);
  return { showSection, setShowSection };
};

const UIDocTypeToIcon: Partial<
  Record<
    `${UIDocInputElement["type"]}-${UIDocInputElement["inputType"]}`,
    string
  > &
    Record<Exclude<UIDoc["type"], "input">, string>
> = {
  link: mdiLink,
  button: mdiButtonPointer,
  popup: mdiButtonPointer,
  select: mdiButtonPointer,
  "input-text": mdiFormTextbox,
  "input-checkbox": mdiCheckboxOutline,
  "input-file": mdiFileUploadOutline,
  "input-number": mdiNumeric,
  "input-select": mdiFormSelect,
  smartform: mdiListBoxOutline,
  "smartform-popup": mdiListBoxOutline,
  list: mdiFormatListBulleted,
  section: mdiCardTextOutline,
  tab: mdiCardTextOutline,
  "accordion-item": mdiCardTextOutline,
  "drag-handle": mdiArrowSplitVertical,
  "hotkey-popup": mdiKeyboard,
  navbar: mdiMenu,
  text: mdiTextLong,
  canvas: mdiChartLine,
  // page: mdiGrid,
};

if (isPlaywrightTest) {
  flatUIDocs.forEach(({ title: searchTerm }) => {
    let lowestRank = { value: Infinity, title: "" };
    flatUIDocs.forEach(({ title, description, parentTitles }) => {
      const rank = getItemSearchRank(
        {
          title,
          subTitle: description,
          level: parentTitles.length,
        },
        searchTerm,
      );

      if (rank < lowestRank.value) {
        lowestRank = { value: rank, title };
      }
    });

    if (searchTerm !== lowestRank.title) {
      throw new Error(
        `Search rank test failed for term "${searchTerm}". Expected "${searchTerm}" to rank highest, but got "${lowestRank.title}"`,
      );
    }
  });
}
