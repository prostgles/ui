import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { FlashMessage } from "../../components/FlashMessage";
import Popup from "../../components/Popup/Popup";
import { SearchList } from "../../components/SearchList/SearchList";
import { flatDocs } from "../UIDocs";
import { Documentation } from "./Documentation";
import { useGoToUI } from "./useGoToUI";
import "./CommandPalette.css";
import { ScrollFade } from "../../components/ScrollFade/ScrollFade";

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
                items={flatDocs.map((data) => {
                  return {
                    key: data.title,
                    parentLabels: data.parentTitles,
                    label: data.title,
                    subLabel: data.description,
                    onPress: async () => {
                      setShowSection(undefined);
                      await goToUIDocItem(data);
                    },
                    data,
                  };
                })}
              />
            : <ScrollFade className="oy-auto">
                <Documentation isElectron={isElectron} />
              </ScrollFade>
            }
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
