import React from "react";
import { Hotkey } from "../../components/Hotkey";
import { t } from "../../i18n/i18nUtils";

export const SQLHotkeys = () => {
  return (
    <div className="flex-col ai-start gap-1 ">
      <Hotkey
        label={t.SQLHotkeys["Show autocomplete suggestions"]}
        keys={["ctrl", "space"]}
      />
      <Hotkey label={t.SQLHotkeys["Execute current statement"]} keys={[]} />
      <Hotkey label="" keys={["ctrl", "enter"]} />
      <Hotkey label="" keys={["alt", "e"]} />
      <Hotkey
        label={t.SQLHotkeys["Select current statement"]}
        keys={["ctrl", "b"]}
      />
      <Hotkey label={t.SQLHotkeys["Show all suggestions"]} keys={["?"]} />
      <Hotkey label={t.SQLHotkeys["Show PSQL command queries"]} keys={["\\"]} />
    </div>
  );
};
