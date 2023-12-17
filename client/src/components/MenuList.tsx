import { mdiMenu } from "@mdi/js";
import { AnyObject } from "prostgles-types";
import React from 'react';
import { Icon } from "./Icon/Icon";
import './List.css';
import PopupMenu from "./PopupMenu";


export type MenuListitem = {
  key?: string;
  label: string;
  contentRight?: React.ReactNode;
  leftIconPath?: string;
  disabledText?: string;
  title?: string;
  onPress?: () => void;
  style?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  hide?: boolean; 
  listProps?: React.DetailedHTMLProps<React.LiHTMLAttributes<HTMLLIElement>, HTMLLIElement> | AnyObject;
}
type P = {
  items: MenuListitem[];
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  variant?: "horizontal-tabs" | "horizontal" | "vertical" | "dropdown";
  activeKey?: string;
}

type S = {
  activeIndex?: number;
  collapsed: boolean;
}

export default class MenuList extends React.Component<P, S> {
  state: S = {
    collapsed: false
  }

  renderItem = (d: MenuListitem, i: number, noClick = false) => {
    const canPress = !!(d.onPress && !d.disabledText && !noClick);

    const { activeKey, variant } = this.props;
    const variantStyle: React.CSSProperties = variant === "horizontal-tabs"? {
      borderRadius: 0,
      fontSize: "16px",
      fontWeight: "bold",
      cursor: "pointer",
      borderBottomColor: "var(--gray-200)",
      borderBottomStyle: "solid",
      borderBottomWidth: "2px",
      flex: 1,
      color: "var(--gray-600)",
      ...(activeKey === (d.key ?? d.label) && {
        color: "var(--active)",
        borderBottomColor: "var(--active)",
      })
    } : {};

    const labelVariantStyle: React.CSSProperties = variant === "horizontal-tabs"? {
      justifyContent: "center"
    } : {};

    return <li 
      {...d.listProps}
      key={i} 
      role="listitem" 
      tabIndex={canPress? 0 : undefined}
      title={d.disabledText || d.title}
      style={{ ...variantStyle, ...(d.style || {}), ...(d.disabledText? { cursor: "not-allowed", opacity: 0.5 } : {})}}
      className={"flex-row  p-p5  bg-li " + ((!d.disabledText && d.onPress)? " pointer " : " ")}
      onClick={canPress? () => {
        d.onPress?.();
      } : undefined}
      onKeyUp={canPress?  e => {
        if(e.key === "Enter") d.onPress?.()
      } : undefined}
    >
      <label className="mr-p5 f-1 flex-row ai-center noselect" style={{ ...labelVariantStyle, cursor: "inherit"  }}>  
        {!!d.leftIconPath && <Icon className="mr-p5 f-0" path={d.leftIconPath} size={1} style={d.iconStyle} />}
        {d.label? <div style={d.labelStyle}>{d.label}</div> : d.label} {d.contentRight || null}
      </label>
    </li>
  }

  refList?: HTMLUListElement;
  render(){
    
    const {
      className = "",
      style = {},
      items = [],
      activeKey = this.props.items[0]?.key
    } = this.props;

    const isDropDown = this.props.variant === "dropdown"

    const variant = this.props.variant && !isDropDown? this.props.variant : "vertical";

    const variantStyle: React.CSSProperties = variant === "horizontal-tabs"? {
      borderRadius: 0,
      fontSize: "20px",
      fontWeight: "bold",
      cursor: "pointer",
      color: "var(--gray-600)"
    } : {}

    const itemList = (
      <div className={"MenuList list-comp rounded " + (variant === "vertical"? " f-1 max-w-fit min-w-fit " : "") + className} // 
        style={{ maxHeight: "99vh", padding: 0, ...variantStyle, ...style }}
        onKeyDown={e => {
          if(!this.refList) return;
          const lastChild = this.refList.lastChild as HTMLLIElement,
            firstChild = this.refList.firstChild as HTMLLIElement,
            previousElementSibling = document.activeElement?.previousElementSibling as HTMLElement,
            nextElementSibling = document.activeElement?.nextElementSibling as HTMLElement;

          switch (e.key) {
            case "ArrowUp": 
              if(document.activeElement === firstChild){
                lastChild.focus();
              } else if(this.refList.childElementCount) { 
                previousElementSibling.focus(); 
              }
              break;
            case "ArrowDown":
              if(document.activeElement === lastChild) { 
                firstChild.focus(); 
              } else if(this.refList.childElementCount) {
                nextElementSibling.focus(); 
              }
            break;
          }
        }}
      >
        <ul className={"f-1 o-auto min-h-0 min-w-0 " + (variant === "vertical"? " flex-col ws-nowrap " : "flex-row ")} 
          role="list" 
          ref={r => { if(r) this.refList = r; }}
          style={{ padding: 0 }}
        >
          {items.filter(d => !d.hide).map((d, i) => {
            return this.renderItem(d, i)
          })}
        </ul>
      </div>
    );

    if(isDropDown){
      const activeItem = items.find(d => activeKey === (d.key ?? d.label)) ?? items[0]!;

      return <PopupMenu 
        style={{ width: "100%" }}
        positioning="beneath-left"
        button={(
          <button 
            className="bg-blue-300-hover:hover"
            style={{ width: "100%", borderRadius: 0 }}
          >
            <div className="flex-row ai-center">
              {this.renderItem(activeItem, 0, true)}
              <Icon path={mdiMenu} className="f-0 ml-auto" size={1} />
            </div>
          </button>
        )}
        onClickClose={true}
        contentStyle={{ padding: 0 }}
        render={popupClose => {
          return itemList
        }} 
      />
    }

    return itemList;
  }
}

