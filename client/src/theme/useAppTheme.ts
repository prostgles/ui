import { useEffect, useState } from "react";
import { appTheme, type AppState, type Theme } from "../App";
import { useLocalSettings } from "../dashboard/localSettings";

const THEMES = ["light", "dark", "from-system"] as const;
const THEME_SETTING_NAME = "theme" as const;

export const useAppTheme = (state: Pick<AppState, "serverState" | "user">) => {
  const userThemeOption = state.user?.options?.theme;

  const { themeOverride } = useLocalSettings();
  const userTheme = getTheme(themeOverride ?? userThemeOption);
  const [theme, setTheme] = useState(userTheme);

  useEffect(() => {
    if (!themeOverride) return;
    setTheme(themeOverride);
  }, [themeOverride]);

  useEffect(() => {
    appTheme.set(theme);
    if (!userThemeOption || userThemeOption === "from-system") return;
    /** We persist the theme to localSettings to ensure theme persists after logging out */
    localStorage.setItem(THEME_SETTING_NAME, userThemeOption);
  }, [theme, userThemeOption]);

  useEffect(() => {
    const listener = () => {
      setTheme(getTheme(userThemeOption));
    };

    const matcher = window.matchMedia("(prefers-color-scheme: dark)");
    matcher.addEventListener("change", listener);

    return () => matcher.removeEventListener("change", listener);
  }, [userThemeOption]);

  useEffect(() => {
    if (!userThemeOption) return;
    if (theme !== userTheme) {
      setTheme(userTheme);
    }
  }, [userThemeOption, userTheme, theme]);

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
