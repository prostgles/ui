import { useEffect, useState } from "react";

export const useFullscreen = () => {
  const [fullscreen, setFullscreen] = useState(false);

  /** Close on escape */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  const fullscreenOnStyle =
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
      } satisfies React.CSSProperties)
    : undefined;

  const fullscreenStyle = {
    ...fullscreenOnStyle,
    background: `var(--bg-color-0)`,
  };

  return {
    fullscreen,
    setFullscreen,
    fullscreenStyle,
  };
};
