import React from "react"
import Btn, { BtnProps } from "./Btn"
import MenuList, { MenuListitem } from "./MenuList"
import PopupMenu from "./PopupMenu"

type PopupMenuListProps = ({ btnProps: BtnProps<void> } | { button: React.ReactChild }) & {
  items: MenuListitem[];
  listStyle?: React.CSSProperties;
}
export const PopupMenuList = (props: PopupMenuListProps) => {

  const theButton = "button" in props? props.button : <Btn
  {...props.btnProps}
 />
  
  return <PopupMenu
    positioning="beneath-left"
    contentStyle={{ padding: 0, borderRadius: 0 }}
    clickCatchStyle={{ opacity: 0 }}
    rootStyle={{ borderRadius: 0 }}
    button={theButton}
  >
    <MenuList 
      style={{  borderRadius: 0, ...props.listStyle }} 
      items={props.items}
    />
  </PopupMenu>
}