import { mdiMenu } from "@mdi/js";
import React, { useMemo } from "react";
import type { Command, TestSelectors } from "../Testing";
import { classOverride } from "./Flex";
import { Icon } from "./Icon/Icon";
import "./List.css";
import { MenuListItem, type MenuListitem } from "./MenuListItem";
import PopupMenu from "./PopupMenu";
import Select from "./Select/Select";
import { useScrollFade } from "./ScrollFade/ScrollFade";

export type MenuListProps = TestSelectors & {
  items: MenuListitem[];
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  variant?: "horizontal-tabs" | "horizontal" | "vertical" | "dropdown";
  compactMode?: boolean;
  activeKey?: string;
};

export const MenuList = (props: MenuListProps) => {
  const {
    className = "",
    style = {},
    items = [],
    compactMode,
    variant,
  } = props;

  const visibleItems = useMemo(() => {
    return items.filter((d) => !d.hide);
  }, [items]);

  const refList = React.useRef<HTMLUListElement>(null);
  const { localVariant } = useMemo(() => {
    const isDropDown = variant === "dropdown";
    const localVariant = variant && !isDropDown ? variant : "vertical";
    return { localVariant };
  }, [variant]);

  const { isCompactMode, rootStyle } = useMemo(() => {
    const isCompactMode = Boolean(
      compactMode && window.isMediumWidthScreen && localVariant === "vertical",
    );

    const variantStyle: React.CSSProperties =
      localVariant === "horizontal-tabs" ?
        {
          borderRadius: 0,
          fontSize: "20px",
          fontWeight: "bold",
          cursor: "pointer",
        }
      : {};
    const rootStyle: React.CSSProperties = {
      maxHeight: "99vh",
      padding: 0,
      ...variantStyle,
      ...style,
    };
    return { isCompactMode, rootStyle };
  }, [compactMode, localVariant, style]);

  const { onKeyDownFocusSiblings } = useMemo(() => {
    const onKeyDownFocusSiblings: React.KeyboardEventHandler<HTMLDivElement> = (
      e,
    ) => {
      if (!refList.current) return;
      const lastChild = refList.current.lastChild as HTMLLIElement,
        firstChild = refList.current.firstChild as HTMLLIElement,
        previousElementSibling = document.activeElement
          ?.previousElementSibling as HTMLElement,
        nextElementSibling = document.activeElement
          ?.nextElementSibling as HTMLElement;

      switch (e.key) {
        case "ArrowUp":
          if (document.activeElement === firstChild) {
            lastChild.focus();
          } else if (refList.current.childElementCount) {
            previousElementSibling.focus();
          }
          break;
        case "ArrowDown":
          if (document.activeElement === lastChild) {
            firstChild.focus();
          } else if (refList.current.childElementCount) {
            nextElementSibling.focus();
          }
          break;
      }
    };
    return { onKeyDownFocusSiblings };
  }, []);

  const isVertical = localVariant === "vertical";
  const overflows = useScrollFade({ ref: refList });
  const showSelect = !isVertical && overflows.x;

  return (
    <MenuListPopupWrapper
      {...props}
      isCompactMode={isCompactMode}
      visibleItems={visibleItems}
    >
      <div
        className={classOverride(
          "MenuList relative list-comp rounded " +
            (isVertical ? " f-1 max-w-fit min-w-fit " : "flex-row"),
          className,
        )}
        data-command={props["data-command"] ?? "MenuList"}
        style={rootStyle}
        onKeyDown={onKeyDownFocusSiblings}
      >
        <ul
          className={`no-decor relative f-1 o-auto min-h-0 min-w-0 ${isCompactMode ? "trigger-hover" : ""} ${isVertical ? " flex-col ws-nowrap " : "flex-row no-scroll-bar oy-hidden "}`}
          role="list"
          ref={refList}
          style={{ padding: 0 }}
          onWheel={
            isVertical ? undefined : (
              (e) => {
                if (e.shiftKey) return;
                // e.currentTarget.scrollLeft += e.deltaY;
                e.currentTarget.scrollBy({
                  left: e.deltaY,
                  behavior: "smooth",
                });
              }
            )
          }
        >
          {visibleItems.map((d, i) => {
            return (
              <MenuListItem
                key={d.key ?? i}
                item={d}
                {...props}
                isCompactMode={isCompactMode}
                noClick={false}
              />
            );
          })}
        </ul>
        {showSelect && (
          <Select
            fullOptions={visibleItems.map(({ key, label }, i) => ({
              key: key ?? i,
              label: textContent(label),
            }))}
            value={props.activeKey}
            btnProps={{
              color: "white",
              children: "",
              variant: "icon",
            }}
            onChange={(key, e) => {
              const item = visibleItems.find((d, i) => (d.key ?? i) === key);
              refList.current
                ?.querySelector(`[data-key="${key}"]`)
                ?.scrollIntoView({ behavior: "smooth" });
              item?.onPress?.(e as any);
            }}
          />
        )}
      </div>
    </MenuListPopupWrapper>
  );
};

const MenuListPopupWrapper = ({
  children,
  isCompactMode,
  visibleItems,
  ...props
}: MenuListProps & {
  children: React.ReactNode;
  isCompactMode: boolean;
  visibleItems: MenuListitem[];
}) => {
  const { activeKey, variant } = props;
  const activeItem = useMemo(() => {
    const activeItem =
      visibleItems.find((d) => activeKey === (d.key ?? d.label)) ??
      visibleItems[0]!;
    return activeItem;
  }, [visibleItems, activeKey]);

  if (variant !== "dropdown") {
    return children;
  }

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
            <MenuListItem
              item={activeItem}
              {...props}
              isCompactMode={isCompactMode}
              noClick={true}
            />
            <Icon path={mdiMenu} className="f-0 ml-auto" size={1} />
          </div>
        </button>
      }
      onClickClose={true}
      contentStyle={{ padding: 0 }}
    >
      {children}
    </PopupMenu>
  );
};

function textContent(elem: React.ReactElement | string): string {
  if (!elem) {
    return "";
  }
  if (typeof elem === "string") {
    return elem;
  }
  const children = elem.props && elem.props.children;
  if (children instanceof Array) {
    return children.map(textContent).join(" ");
  }
  return textContent(children);
}
