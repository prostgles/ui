import { FlashMessage } from "@components/FlashMessage";
import Popup from "@components/Popup/Popup";
import { SearchList } from "@components/SearchList/SearchList";
import React from "react";
import { NavLink } from "react-router";
import "./CommandPalette.css";
import { Documentation } from "./Documentation";
import { DynamicComponent } from "./DynamicComponent";
import { useCommandPaletteState } from "./useCommandPaletteState";

/**
 * By pressing Ctrl+K, the user to search and go to functionality in the UI.
 */
export const CommandPalette = ({
  isElectron,
  prglLoaded,
}: {
  isElectron: boolean;
  prglLoaded: boolean;
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
  } = useCommandPaletteState(prglLoaded);
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
              quickPeekComponent ??
              (showSection === "commands" ? undefined : (
                <NavLink to={"/documentation"}>Documentation</NavLink>
              ))
            }
            data-command="CommandPalette"
            clickCatchStyle={{ opacity: 1 }}
            positioning={showSection === "commands" ? "top-center" : "center"}
            onClose={() => {
              setShowSection(undefined);
              setQuickPeekComponent(undefined);
            }}
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
              <>
                {quickPeekComponent ?
                  <DynamicComponent component={quickPeekComponent} props={{}} />
                : <SearchList
                    placeholder="Search actions..."
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
