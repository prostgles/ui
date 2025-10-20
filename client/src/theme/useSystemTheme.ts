import { useEffect, useState } from "react";

export const useSystemTheme = () => {
  const [systemTheme, setSystemTheme] = useState(getTheme());
  useEffect(() => {
    const listener = () => {
      setSystemTheme(getTheme());
    };

    const matcher = window.matchMedia("(prefers-color-scheme: dark)");
    matcher.addEventListener("change", listener);

    return () => matcher.removeEventListener("change", listener);
  }, []);

  return systemTheme;
};

const getTheme = (): "dark" | "light" => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ?
      "dark"
    : "light";
};
