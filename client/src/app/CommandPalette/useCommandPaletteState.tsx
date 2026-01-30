import { getProperty } from "@common/utils";
import Btn from "@components/Btn";
import { Icon } from "@components/Icon/Icon";
import type { SearchListItem } from "@components/SearchList/SearchList";
import { getItemSearchRank } from "@components/SearchList/searchMatchUtils/getItemSearchRank";
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
  mdiOpenInApp,
  mdiTextLong,
} from "@mdi/js";
import React, { useEffect, useState } from "react";
import { isPlaywrightTest } from "src/i18n/i18nUtils";
import { flatUIDocs, type UIDoc, type UIDocInputElement } from "../UIDocs";
import type { CommandSearchHighlight } from "./CommandPalette";
import "./CommandPalette.css";
import { useGoToUI } from "./useGoToUI";
import type { DynamicComponentRegistry } from "./DynamicComponent";

export const useCommandPaletteState = () => {
  const { showSection, setShowSection } = useOnKeyDown();
  const [highlights, setHighlights] = useState<CommandSearchHighlight[]>([]);
  const { message, setMessage, goToUIDocItem } = useGoToUI(setHighlights);
  const [quickPeekComponent, setQuickPeekComponent] =
    useState<keyof DynamicComponentRegistry>();
  const items = flatUIDocs.map((data) => {
    const iconKey =
      data.type === "input" ? `${data.type}-${data.inputType}` : data.type;
    const iconPath = data.iconPath ?? getProperty(UIDocTypeToIcon, iconKey);
    if (!iconPath) {
      console.warn("No icon for UIDoc type", iconKey, data);
    }
    const componentName =
      data.componentName ||
      data.parentDocs.find((d) => d.componentName)?.componentName;

    const goToItem = () => {
      setShowSection(undefined);
      return goToUIDocItem(data);
    };
    return {
      key: data.title,
      parentLabels: data.parentTitles,
      label: data.title,
      subLabel: data.description,
      contentLeft:
        iconPath ?
          <Icon path={iconPath} title={data.type} className="text-1 f-0" />
        : undefined,
      onPress: async () => {
        if (componentName) {
          setQuickPeekComponent(componentName);
        } else {
          await goToItem();
        }
      },
      contentRight: Boolean(componentName) && (
        <Btn
          iconPath={mdiOpenInApp}
          onClick={() => {
            void goToItem();
          }}
        />
      ),
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
    } satisfies SearchListItem;
  });

  return {
    showSection,
    setShowSection,
    highlights,
    message,
    setMessage,
    items,
    quickPeekComponent,
    setQuickPeekComponent,
  };
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
