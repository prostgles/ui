import { useEffect, useState } from "react";
import type { AppState, Theme } from "../App";
import { appTheme } from "../App";

const THEMES = ["light", "dark", "from-system"] as const;
const THEME_SETTING_NAME = "theme" as const;

export const useAppTheme = (state: Omit<AppState, "title" | "isConnected">) => {
  const user = state.prglState?.user ?? state.prglState?.auth.user;
  const userThemeOption = user?.options?.theme as
    | (typeof THEMES)[number]
    | undefined;
  const userTheme = getTheme(userThemeOption);
  const [theme, setTheme] = useState(userTheme);
  useEffect(() => {
    /** We persist the theme to localSettings to ensure theme persists after logging out */
    localStorage.setItem(THEME_SETTING_NAME, theme);
    appTheme.set(theme);
  }, [theme]);

  useEffect(() => {
    const listener = () => {
      setTheme(userTheme);
    };
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", listener);

    return () =>
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", listener);
  }, [userTheme]);

  useEffect(() => {
    if (!user?.options?.theme) return;
    if (theme !== userTheme) {
      setTheme(userTheme);
    }
  }, [user, userTheme, theme]);

  useEffect(() => {
    document.documentElement.classList.remove("dark-theme", "light-theme");
    document.documentElement.classList.add(`${theme}-theme`);
    document.body.classList.add("text-0");
    if (
      state.serverState &&
      (!state.serverState.isElectron || state.serverState.electronCredsProvided)
    ) {
      document.body.classList.add("bg-color-2");
    }
  }, [theme, state.serverState]);

  return { theme, userThemeOption: userThemeOption ?? "from-system" };
};

/**
 * Returns the correct theme based on the user's preference and the system
 */
const getTheme = (_desired: Theme | "from-system" | undefined): Theme => {
  let savedTheme = _desired;
  if (!_desired) {
    const savedThemeSetting = localStorage.getItem(THEME_SETTING_NAME);
    savedTheme = THEMES.find((t) => t === savedThemeSetting);
  }
  const desired = savedTheme ?? "from-system";
  if (desired !== "from-system") return desired;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ?
      "dark"
    : "light";
};
