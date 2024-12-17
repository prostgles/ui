import React from "react";
import { Hotkey } from "../../components/Hotkey";

export const SQLHotkeys = () => {
  return (
    <div className="flex-col ai-start gap-1 ">
      <Hotkey label="Show autocomplete suggestions" keys={["ctrl", "space"]} />
      <Hotkey label="Execute current statement" keys={[]} />
      <Hotkey label="" keys={["ctrl", "enter"]} />
      <Hotkey label="" keys={["alt", "e"]} />
      <Hotkey label="Select current statement" keys={["ctrl", "b"]} />
      <Hotkey label="Show all suggestions" keys={["?"]} />
      <Hotkey label="Show PSQL command queries" keys={["\\"]} />
    </div>
  );
};
