import React from "react";
import type { BtnProps } from "./Btn";
import Btn from "./Btn";
import type { MenuListitem } from "./MenuList";
import { MenuList } from "./MenuList";
import PopupMenu from "./PopupMenu";

type PopupMenuListProps = (
  | { btnProps: BtnProps<void> }
  | { button: React.ReactChild }
) & {
  items: MenuListitem[];
  listStyle?: React.CSSProperties;
};
export const PopupMenuList = (props: PopupMenuListProps) => {
  const theButton =
    "button" in props ? props.button : <Btn {...props.btnProps} />;

  return (
    <PopupMenu
      positioning="beneath-left"
      contentStyle={{ padding: 0, borderRadius: 0 }}
      clickCatchStyle={{ opacity: 0 }}
      rootStyle={{ borderRadius: 0 }}
      button={theButton}
    >
      <MenuList
        activeKey=""
        style={{ borderRadius: 0, ...props.listStyle }}
        items={props.items}
      />
    </PopupMenu>
  );
};
