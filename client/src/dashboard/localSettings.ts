import { isObject } from "prostgles-types";
import { useEffect, useState } from "react";

export type LocalSettings = {
  centeredLayout?: {
    enabled: boolean;
    maxWidth: number;
  };
  themeOverride?: "light" | "dark";
};

type LocalSettingsListener = (s: LocalSettings) => void;

let localSettingsListeners: LocalSettingsListener[] = [];

const LOCALSTORAGE_KEY = "localSettings" as const;

const parseLocalSettings = () => {
  const localSettings: LocalSettings = {};
  try {
    const savedSettings = window.localStorage.getItem(LOCALSTORAGE_KEY);
    if (savedSettings) {
      const parsedSavedSettings: LocalSettings | undefined =
        JSON.parse(savedSettings);
      if (parsedSavedSettings && isObject(parsedSavedSettings)) {
        const { centeredLayout, themeOverride } = parsedSavedSettings;
        if (
          centeredLayout &&
          typeof ((centeredLayout as any).enabled ?? false) === "boolean" &&
          Number.isFinite(centeredLayout.maxWidth)
        ) {
          localSettings.centeredLayout = centeredLayout;
        }
        if (themeOverride && ["light", "dark"].includes(themeOverride)) {
          localSettings.themeOverride = themeOverride;
        }
      }
      return localSettings;
    }
  } catch (e) {
    console.error("localSettings error: ", e);
  }
  return {};
};

window.addEventListener(
  "storage",
  function (event) {
    // if (event.storageArea === localStorage) {
    const s = parseLocalSettings();
    localSettingsListeners.forEach((l) => l(s));
    // }
  },
  false,
);

export const localSettings = {
  add: (l: LocalSettingsListener) => {
    if (!localSettingsListeners.some((ll) => ll === l)) {
      localSettingsListeners.push(l);
    }
  },
  remove: (l: LocalSettingsListener) => {
    localSettingsListeners = localSettingsListeners.filter((ll) => ll !== l);
  },
  get: () => ({
    ...parseLocalSettings(),
    $set: (ls: Partial<LocalSettings>) => {
      localStorage.setItem(
        LOCALSTORAGE_KEY,
        JSON.stringify({
          ...parseLocalSettings(),
          ...ls,
        }),
      );
      window.dispatchEvent(new Event("storage"));
    },
  }),
} as const;

export const useLocalSettings = () => {
  const [ls, setLS] = useState(localSettings.get());

  useEffect(() => {
    const onChange = (newSettings: LocalSettings) => {
      setLS({ ...newSettings, $set: ls.$set });
    };
    localSettings.add(onChange);

    return () => localSettings.remove(onChange);
  }, [ls]);

  return ls;
};
