import { FlashMessage } from "@components/FlashMessage";
import Popup from "@components/Popup/Popup";
import {
  SearchList,
  type SearchListProps,
} from "@components/SearchList/SearchList";
import React, { useCallback, useEffect, useRef } from "react";
import { NavLink } from "react-router";
import "./CommandPalette.css";
import { Documentation } from "./Documentation";
import { DynamicComponent } from "./DynamicComponent";
import { useCommandPaletteState } from "./useCommandPaletteState";
import type { Prgl } from "src/App";
import { SearchAll, SEARCH_TYPES } from "src/dashboard/SearchAll/SearchAll";
import { Select } from "@components/Select/Select";
import { commandPaletteStore } from "./commandPaletteStore";

/**
 * By pressing Ctrl+K, the user to search and go to functionality in the UI.
 */
export const CommandPalette = ({
  isElectron,
  prglLoaded,
}: {
  isElectron: boolean;
  prglLoaded: undefined | Prgl;
}) => {
  const {
    showSection,
    setShowSection,
    items,
    highlights,
    message,
    setMessage,
    quickPeekComponent,
    setQuickPeekComponent,
  } = useCommandPaletteState(Boolean(prglLoaded));
  const { searchAllProps, defaultTerm } = commandPaletteStore.useStore(
    (state) => state,
  );
  const searchTerm = useRef(defaultTerm);
  useEffect(() => {
    searchTerm.current = defaultTerm;
    setQuickPeekComponent(undefined);
  }, [showSection, defaultTerm, setQuickPeekComponent]);
  const onClose = () => {
    setShowSection(undefined);
    setQuickPeekComponent(undefined);
  };
  const searchTypeSelect = (
    <Select
      title="Search type"
      size="small"
      className="m-p25 f-0"
      fullOptions={SEARCH_OPTIONS.filter(
        (option) => option.key === "commands" || searchAllProps,
      ).map((option) => ({
        ...option,
        subLabel: `Type ${option.prefix}`,
      }))}
      value={showSection}
      onChange={(section) => {
        setQuickPeekComponent(undefined);
        setShowSection(section, searchTerm.current);
      }}
    />
  );
  const onType = useCallback<NonNullable<SearchListProps["onType"]>>(
    (term, setTerm) => {
      searchTerm.current = term;
      const section = SEARCH_OPTIONS.find((option) =>
        term.startsWith(option.prefix),
      )?.key;
      const { showSection, searchAllProps } = commandPaletteStore.getState();
      if (!section || (section !== "commands" && !searchAllProps)) return;

      const query = term.slice(1).trimStart();
      searchTerm.current = query;
      setTerm(query);
      if (section !== showSection) {
        setShowSection(section, query);
      }
    },
    [setShowSection],
  );
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
            key={showSection === "docs" ? "docs" : "search"}
            title={
              quickPeekComponent ??
              (showSection !== "docs" ? undefined : (
                <NavLink to={"/documentation"}>Documentation</NavLink>
              ))
            }
            showFullscreenToggle={{
              getContentStyle: (fullscreen) =>
                showSection === "docs" ?
                  {
                    textAlign: "left",
                  }
                : fullscreen ? {}
                : {
                    width: "min(calc(100vw - 2em), 700px)",
                    maxHeight: "min(100vh, 500px)",
                  },
            }}
            data-command="CommandPalette"
            clickCatchStyle={{ opacity: 1 }}
            positioning={showSection !== "docs" ? "top-center" : "center"}
            onClose={onClose}
            contentClassName={
              "flex-col gap-2 ai-center " +
              (showSection === "docs" ? " p-2" : "p-1")
            }
          >
            {showSection !== "docs" ?
              <>
                {quickPeekComponent ?
                  <DynamicComponent
                    component={quickPeekComponent}
                    props={{ connectionId: prglLoaded?.connectionId }}
                  />
                : showSection !== "commands" && searchAllProps ?
                  <SearchAll
                    {...searchAllProps}
                    searchType={showSection}
                    defaultTerm={defaultTerm}
                    leftContent={searchTypeSelect}
                    onType={onType}
                    onClose={onClose}
                  />
                : <SearchList
                    placeholder="Search actions..."
                    leftContent={searchTypeSelect}
                    defaultSearch={defaultTerm}
                    onType={onType}
                    autoFocus={true}
                    limit={100}
                    items={items}
                  />
                }
              </>
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

const SEARCH_OPTIONS = [
  { key: "commands", label: "Commands", prefix: ">" },
  ...SEARCH_TYPES.map((option) => ({
    ...option,
    prefix: option.key === "rows" ? "?" : "/",
  })),
] as const;
