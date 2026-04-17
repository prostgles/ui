import { isTopMostPopup } from "@components/Popup/Popup";
import { useEffect, useState } from "react";

export const useFullscreen = (
  divRef: React.RefObject<HTMLDivElement>,
  isInsidePopup: boolean,
) => {
  const [fullscreen, setFullscreen] = useState(false);

  /** Close on escape */
  useEffect(() => {
    if (isInsidePopup) return; // Let the popup handle escape if we're inside a popup
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen && divRef.current) {
        if (!isTopMostPopup(divRef.current)) return;

        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [divRef, fullscreen]);

  const fullscreenStyle =
    fullscreen ?
      ({
        position: "fixed",
        top: 0,
        left: 0,
        maxHeight: "100vh",
        maxWidth: "100vw",
        width: "100vw",
        height: "100vh",
        zIndex: 1000,
        background: `var(--bg-color-0)`,
      } satisfies React.CSSProperties)
    : undefined;

  return {
    fullscreen,
    setFullscreen,
    fullscreenStyle,
  };
};
