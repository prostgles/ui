import { mdiMenu } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React from "react";
import { Icon } from "./Icon/Icon";
import "./List.css";
import PopupMenu from "./PopupMenu";
import type { Command, TestSelectors } from "../Testing";
import { classOverride } from "./Flex";

export type MenuListitem = {
  key?: string;
  label: React.ReactNode;
  contentRight?: React.ReactNode;
  leftIconPath?: string;
  disabledText?: string;
  title?: string;
  onPress?: (
    e:
      | React.MouseEvent<HTMLLIElement, MouseEvent>
      | React.KeyboardEvent<HTMLLIElement>,
  ) => void;
  style?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  hide?: boolean;
  listProps?:
    | React.DetailedHTMLProps<
        React.LiHTMLAttributes<HTMLLIElement>,
        HTMLLIElement
      >
    | AnyObject;
};
type P = TestSelectors & {
  items: MenuListitem[];
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  variant?: "horizontal-tabs" | "horizontal" | "vertical" | "dropdown";
  compactMode?: boolean;
  activeKey?: string;
};

type S = {
  activeIndex?: number;
  collapsed: boolean;
};

export class MenuList extends React.Component<P, S> {
  state: S = {
    collapsed: false,
  };

  renderItem = (d: MenuListitem, i: number, noClick = false) => {
    const canPress = !!(d.onPress && !d.disabledText && !noClick);

    const { activeKey, variant } = this.props;
    const variantStyle: React.CSSProperties =
      variant === "horizontal-tabs" ?
        {
          borderRadius: 0,
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
          borderColor: "var(--b-default)",
          borderBottomStyle: "solid",
          borderBottomWidth: "4px",
          flex: 1,
          color: "var(--text-0)",
          ...(activeKey === (d.key ?? d.label) && {
            borderColor: "var(--active)",
            backgroundColor: "var(--bg-color-0)",
          }),
        }
      : {};

    const labelVariantStyle: React.CSSProperties =
      variant === "horizontal-tabs" ?
        {
          justifyContent: "center",
        }
      : {};

    return (
      <li
        {...d.listProps}
        key={i}
        data-key={d.key}
        role="listitem"
        tabIndex={canPress ? 0 : undefined}
        title={d.disabledText || d.title}
        style={{
          ...variantStyle,
          ...(d.style || {}),
          ...(d.disabledText ? { cursor: "not-allowed", opacity: 0.5 } : {}),
        }}
        className={`flex-row  p-p5  bg-li ${!d.disabledText && d.onPress ? " pointer " : " "} ${d.key === activeKey ? " selected " : ""}`}
        onClick={
          canPress ?
            (e) => {
              d.onPress?.(e);
            }
          : undefined
        }
        onKeyUp={
          canPress ?
            (e) => {
              if (e.key === "Enter") d.onPress?.(e);
            }
          : undefined
        }
      >
        <label
          className="mr-p5 f-1 flex-row ai-center noselect"
          style={{ ...labelVariantStyle, cursor: "inherit" }}
        >
          {!!d.leftIconPath && (
            <Icon
              className="mr-p5 f-0"
              path={d.leftIconPath}
              size={1}
              style={d.iconStyle}
            />
          )}
          {d.label ?
            <div
              className={this.isCompactMode ? "display-on-trigger-hover" : ""}
              style={d.labelStyle}
            >
              {d.label}
            </div>
          : d.label}{" "}
          {d.contentRight || null}
        </label>
      </li>
    );
  };

  get variantOptions() {
    const isDropDown = this.props.variant === "dropdown";
    const variant =
      this.props.variant && !isDropDown ? this.props.variant : "vertical";
    return { variant, isDropDown };
  }
  get isCompactMode() {
    return (
      this.props.compactMode &&
      window.isMediumWidthScreen &&
      this.variantOptions.variant === "vertical"
    );
  }

  refList?: HTMLUListElement;
  render() {
    const {
      className = "",
      style = {},
      items = [],
      activeKey = this.props.items[0]?.key,
    } = this.props;

    const { variant, isDropDown } = this.variantOptions;
    const variantStyle: React.CSSProperties =
      variant === "horizontal-tabs" ?
        {
          borderRadius: 0,
          fontSize: "20px",
          fontWeight: "bold",
          cursor: "pointer",
        }
      : {};

    const itemList = (
      <div
        className={classOverride(
          "MenuList list-comp rounded " +
            (variant === "vertical" ? " f-1 max-w-fit min-w-fit " : ""),
          className,
        )}
        data-command={
          this.props["data-command"] ?? ("MenuList" satisfies Command)
        }
        style={{ maxHeight: "99vh", padding: 0, ...variantStyle, ...style }}
        onKeyDown={(e) => {
          if (!this.refList) return;
          const lastChild = this.refList.lastChild as HTMLLIElement,
            firstChild = this.refList.firstChild as HTMLLIElement,
            previousElementSibling = document.activeElement
              ?.previousElementSibling as HTMLElement,
            nextElementSibling = document.activeElement
              ?.nextElementSibling as HTMLElement;

          switch (e.key) {
            case "ArrowUp":
              if (document.activeElement === firstChild) {
                lastChild.focus();
              } else if (this.refList.childElementCount) {
                previousElementSibling.focus();
              }
              break;
            case "ArrowDown":
              if (document.activeElement === lastChild) {
                firstChild.focus();
              } else if (this.refList.childElementCount) {
                nextElementSibling.focus();
              }
              break;
          }
        }}
      >
        <ul
          className={`f-1 o-auto min-h-0 min-w-0 ${this.isCompactMode ? "trigger-hover" : ""} ${variant === "vertical" ? " flex-col ws-nowrap " : "flex-row "}`}
          role="list"
          ref={(r) => {
            if (r) this.refList = r;
          }}
          style={{ padding: 0 }}
        >
          {items
            .filter((d) => !d.hide)
            .map((d, i) => {
              return this.renderItem(d, i);
            })}
        </ul>
      </div>
    );

    if (isDropDown) {
      const activeItem =
        items.find((d) => activeKey === (d.key ?? d.label)) ?? items[0]!;

      return (
        <PopupMenu
          style={{ width: "100%" }}
          positioning="beneath-left"
          button={
            <button
              className="MenuList__button"
              style={{ width: "100%", borderRadius: 0 }}
            >
              <div className="flex-row ai-center">
                {this.renderItem(activeItem, 0, true)}
                <Icon path={mdiMenu} className="f-0 ml-auto" size={1} />
              </div>
            </button>
          }
          onClickClose={true}
          contentStyle={{ padding: 0 }}
          render={(popupClose) => {
            return itemList;
          }}
        />
      );
    }

    return itemList;
  }
}
