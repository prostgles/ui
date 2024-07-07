import { useEffect, useState } from "react";
import type { AppState, Theme} from "./App";
import { appTheme } from "./App";

export const useAppTheme = (state: Omit<AppState, "title" | "isConnected">) => {

  const user = state.prglState?.user ?? state.prglState?.auth.user;
  const userThemeOption = user?.options?.theme ?? "from-system";
  const userTheme = getTheme(userThemeOption);
  const [theme, setTheme] = useState(userTheme);
  useEffect(() => {
    appTheme.set(theme);
  }, [theme]);

  useEffect(() => {
    const listener = (event: MediaQueryListEvent) => {
      const newColorScheme = event.matches ? "dark" : "light";
      setTheme(newColorScheme)
    }
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", listener);

    return () => window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", listener);
  }, [user]);

  useEffect(() => {
    if(!user?.options?.theme) return;
    if(theme !== userTheme){
      setTheme(userTheme);
    }
  }, [user, userTheme, theme]);
  
  useEffect(() => {
    document.documentElement.classList.remove("dark-theme", "light-theme");
    document.documentElement.classList.add(`${theme}-theme`);
    document.body.classList.add("text-0");
    if(state.serverState && (!state.serverState.isElectron || state.serverState.electronCredsProvided)){
      document.body.classList.add("bg-color-2");
    }
  }, [theme, state.serverState]);

  return { theme, userThemeOption };
}

const getTheme = (desired: Theme | "from-system" = "from-system" ): Theme => {
  if(desired !== "from-system") return desired;
  return window.matchMedia("(prefers-color-scheme: dark)").matches? "dark" : "light";
}
