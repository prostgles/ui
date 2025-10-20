import Checkbox from "@components/Checkbox";
import React from "react";
import type { ParsedListItem } from "./SearchList";

export const SearchListRowContent = ({ item }: { item: ParsedListItem }) => {
  if ("content" in item) return item.content;
  const { contentLeft, contentBottom, contentRight } = item;

  return (
    <div
      className="ROWINNER flex-row ai-center f-1 "
      style={item.styles?.rowInner}
    >
      {contentLeft || null}
      <div
        className="LABELWRAPPER flex-col ai-start f-1"
        style={item.styles?.labelWrapper}
      >
        <label
          className={
            "ws-pre mr-p5 f-1 flex-row noselect min-w-0 w-full " +
            (item.disabledInfo ? " not-allowed "
            : item.onPress ? " pointer "
            : " ")
          }
          style={item.style}
        >
          {item.node}
        </label>
        {contentBottom}
      </div>
      {contentRight || null}
      {typeof item.checked === "boolean" ?
        <Checkbox
          id={item.id}
          className="f-0 no-pointer-events"
          checked={item.checked}
          style={{ marginRight: "12px" }}
          onChange={() => {}}
        />
      : null}
    </div>
  );
};
