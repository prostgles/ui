import { useEffect } from "react";
import { appTheme, type AppState, type Theme } from "../App";
import { useLocalSettings } from "../dashboard/localSettings";
import { useSystemTheme } from "./useSystemTheme";

const THEMES = ["light", "dark", "from-system"] as const;
const THEME_SETTING_NAME = "theme" as const;

export const useAppTheme = (state: Pick<AppState, "serverState" | "user">) => {
  const userThemeOption = state.user?.options?.theme;

  const { themeOverride } = useLocalSettings();
  const systemTheme = useSystemTheme();
  const userTheme = getTheme(userThemeOption);
  const theme =
    themeOverride ?? (userTheme === "from-system" ? systemTheme : userTheme);

  useEffect(() => {
    appTheme.set(theme);
    if (!userThemeOption || userThemeOption === "from-system") {
      localStorage.removeItem(THEME_SETTING_NAME);
      return;
    }
    /** We persist the theme to localSettings to ensure theme persists after logging out */
    localStorage.setItem(THEME_SETTING_NAME, userThemeOption);
  }, [theme, userThemeOption]);

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

const getTheme = (_desired: Theme | "from-system" | undefined) => {
  let savedTheme = _desired;
  if (!_desired) {
    const savedThemeSetting = localStorage.getItem(THEME_SETTING_NAME);
    savedTheme = THEMES.find((t) => t === savedThemeSetting);
  }
  const desired = savedTheme ?? "from-system";
  return desired;
};
