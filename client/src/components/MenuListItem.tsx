import type { AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import { Icon } from "./Icon/Icon";
import "./List.css";
import type { MenuListProps } from "./MenuList";

export type MenuListitem = {
  key?: string;
  label: React.ReactElement | string;
  contentRight?: React.ReactNode;
  leftIconPath?: string;
  disabledText?: string;
  title?: string;
  onPress?: (e: React.MouseEvent | React.KeyboardEvent) => void;
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

type Props = Pick<MenuListProps, "activeKey" | "variant"> & {
  item: MenuListitem;
  noClick: boolean;
  isCompactMode: boolean;
};
export const MenuListItem = ({
  activeKey,
  variant,
  item,
  noClick,
  isCompactMode,
}: Props) => {
  const canPress = !!(item.onPress && !item.disabledText && !noClick);

  const isActive = (item.key ?? item.label) === activeKey;
  const { labelVariantStyle, ...itemProps } = useMemo(() => {
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
          ...(isActive && {
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
    const style = {
      ...variantStyle,
      ...(item.style || {}),
      ...(item.disabledText ? { cursor: "not-allowed", opacity: 0.5 } : {}),
    };
    const onClick: React.MouseEventHandler<HTMLLIElement> | undefined =
      canPress ?
        (e) => {
          item.onPress?.(e);
        }
      : undefined;
    const onKeyUp: React.KeyboardEventHandler<HTMLLIElement> | undefined =
      canPress ?
        (e) => {
          if (e.key === "Enter") item.onPress?.(e);
        }
      : undefined;
    return {
      style,
      onClick,
      onKeyUp,
      labelVariantStyle,
    };
  }, [canPress, isActive, item, variant]);

  return (
    <li
      {...item.listProps}
      data-key={item.key}
      role="listitem"
      tabIndex={canPress ? 0 : undefined}
      title={item.disabledText || item.title}
      className={`flex-row  p-p5  bg-li ${!item.disabledText && item.onPress ? " pointer " : " "} ${isActive ? " selected " : ""}`}
      {...itemProps}
      aria-current={isActive ? "true" : undefined}
    >
      <label
        className="mr-p5 f-1 flex-row ai-center noselect"
        style={{ ...labelVariantStyle, cursor: "inherit" }}
      >
        {!!item.leftIconPath && (
          <Icon
            className="mr-p5 f-0"
            path={item.leftIconPath}
            size={1}
            style={item.iconStyle}
          />
        )}
        {item.label ?
          <div
            className={isCompactMode ? "display-on-trigger-hover" : ""}
            style={item.labelStyle}
          >
            {item.label}
          </div>
        : item.label}{" "}
        {item.contentRight || null}
      </label>
    </li>
  );
};
