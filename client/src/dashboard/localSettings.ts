import { useEffect, useState } from "react";

export type LocalSettings = {
  centeredLayout?: {
    enabled: boolean;
    maxWidth: number;
  };
};

type LocalSettingsListener = (s: LocalSettings) => void;

let localSettingsListeners: LocalSettingsListener[] = [];

const LOCALSTORAGE_KEY = "localSettings" as const;

const parseLocalSettings = () => {
  const localSettings: LocalSettings = {};
  try {
    const _localSettingsStr = window.localStorage.getItem(LOCALSTORAGE_KEY);
    if (_localSettingsStr) {
      const _localSettings: LocalSettings | undefined =
        JSON.parse(_localSettingsStr);
      if (_localSettings) {
        const _centeredLayout = _localSettings.centeredLayout;
        if (
          _centeredLayout &&
          typeof ((_centeredLayout as any).enabled ?? false) === "boolean" &&
          Number.isFinite(_centeredLayout.maxWidth)
        ) {
          localSettings.centeredLayout = _centeredLayout;
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
    if (event.storageArea === localStorage) {
      const s = parseLocalSettings();
      localSettingsListeners.forEach((l) => l(s));
    }
  },
  false,
);

const localSettings = {
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
