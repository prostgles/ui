import React from "react";
import Select from "../components/Select/Select";
import { mdiEarth } from "@mdi/js";
import { type Language, LANGUAGES } from "./translations/translations";
import { getLanguage, t } from "./i18nUtils";

export const LanguageSelector = ({ isElectron }: { isElectron: boolean }) => {
  const lang = getLanguage();
  const title = t.common.Language;
  return (
    <Select
      title={title}
      btnProps={{
        variant: "default",
        iconPath: mdiEarth,
        children: window.isLowWidthScreen || isElectron ? title : "",
      }}
      data-command="App.LanguageSelector"
      fullOptions={LANGUAGES}
      value={lang}
      iconPath={mdiEarth}
      onChange={(lang) => {
        setLanguage(lang);
        window.location.reload();
      }}
    />
  );
};

const setLanguage = (lang: Language) => {
  document.documentElement.lang = lang;
  localStorage.setItem("lang", lang);
};
