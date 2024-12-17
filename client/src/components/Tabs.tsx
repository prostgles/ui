import { mdiArrowLeft } from "@mdi/js";
import React from "react";
import { isObject } from "../../../commonTypes/publishUtils";
import type { DeltaOf, DeltaOfData } from "../dashboard/RTComp";
import RTComp from "../dashboard/RTComp";
import Btn from "./Btn";
import { classOverride } from "./Flex";
import { Icon } from "./Icon/Icon";
import type { MenuListitem } from "./MenuList";
import { MenuList } from "./MenuList";
import { useConnectionConfigSearchParams } from "../dashboard/ConnectionConfig/useConnectionConfigSearchParams";
import { getKeys } from "../utils";

export type TabItem = Partial<
  Omit<MenuListitem, "contentRight" | "onPress">
> & {
  content?: React.ReactNode;
};

export type TabItems = {
  [key: string]: TabItem;
};

export type TabsProps<T extends TabItems = TabItems> = {
  items: T;
  style?: React.CSSProperties;
  className?: string;
  listClassName?: string;
  menuStyle?: React.CSSProperties;
  variant?:
    | "horizontal"
    | "vertical"
    | {
        /**
         * If available width is less than this then controls will use a select drop down
         */
        controlsCollapseWidth: number;

        /**
         * If available width is less than the sum of breakpoints then will switch to vertical.
         */
        controlsBreakpoint: number;
        contentBreakpoint: number;
      };

  /**
   * If true then non active controls will be hidden
   */
  compactMode?: "hide-label" | "hide-inactive";
  activeKey?: keyof T & string;
  defaultActiveKey?: keyof T & string;
  onChange?: (itemLabel: (keyof T & string) | undefined) => void;
  contentClass?: string;
  onRender?: (activeItem: TabItem) => React.ReactNode;
};

type S<T> = {
  activeKey?: (keyof T & string) | null;
  variant?: "horizontal" | "vertical";
  controlsCollapsed: boolean;
};

export default class Tabs<T extends TabItems = TabItems> extends RTComp<
  TabsProps<T>,
  S<T>
> {
  state: S<T> = {
    controlsCollapsed: false,
  };

  rootDiv?: HTMLDivElement;
  sizeObeserver?: ResizeObserver;

  onUnmount() {
    this.rootDiv && this.sizeObeserver?.unobserve(this.rootDiv);
  }

  checkVariant = () => {
    if (!this.mounted) return;

    const { variant = "horizontal" } = this.props;
    if (this.rootDiv && isObject(variant)) {
      const { contentBreakpoint, controlsBreakpoint, controlsCollapseWidth } =
        variant;
      let newVariant = this.state.variant;
      const width = document.body.offsetWidth; // this.rootDiv.offsetWidth
      const newCCollapse = width < controlsCollapseWidth;
      if (width < contentBreakpoint + controlsBreakpoint) {
        newVariant = "horizontal";
      } else {
        newVariant = "vertical";
      }

      if (newVariant !== this.state.variant) {
        this.setState({ variant: newVariant });
      }
      if (newCCollapse !== this.state.controlsCollapsed) {
        this.setState({ controlsCollapsed: newCCollapse });
      }
    }
  };

  onDelta(
    deltaP?: DeltaOf<TabsProps<T>>,
    deltaS?: DeltaOf<S<T>>,
    deltaD?: DeltaOfData<{ [x: string]: any }>,
  ): void {
    const { variant = "horizontal" } = this.props;
    if (deltaP?.variant) {
      if (this.rootDiv) {
        this.sizeObeserver?.unobserve(this.rootDiv);
        if (isObject(variant)) {
          this.sizeObeserver = new ResizeObserver(this.checkVariant);
          this.sizeObeserver.observe(this.rootDiv);
        }
      }
    }

    if (!this.state.variant && !isObject(variant)) {
      this.setState({ variant });
    }
  }

  render() {
    const {
      className = "",
      listClassName = "",
      style = {},
      contentClass = "",
      onChange,
      compactMode,
      onRender,
      menuStyle,
    } = this.props;

    const { variant, controlsCollapsed } = this.state;

    const items: TabItems = this.props.items;

    const activeKey =
      this.props.activeKey ??
      (this.state.activeKey === null ?
        undefined
      : (this.state.activeKey ?? this.props.defaultActiveKey));

    let activeContent: React.ReactNode = null;
    if (typeof activeKey === "string" && items[activeKey]?.content) {
      activeContent =
        onRender ? onRender(items[activeKey]!) : items[activeKey]!.content;
    }
    const isHoriz = variant === "horizontal";

    let itemStyle: React.CSSProperties = {
      borderColor: "transparent",
      borderRightStyle: "solid",
      borderRightWidth: "2px",
    };
    let posClass = "flex-row ";
    if (isHoriz) {
      posClass = "flex-col ";
      itemStyle = {
        borderColor: "transparent",
        borderBottomStyle: "solid",
        borderBottomWidth: "2px",
      };
    }
    if (compactMode === "hide-inactive") {
      itemStyle = { borderColor: "transparent" };
    }

    const activeItemStyle = { ...itemStyle };

    let showBackBtn = false;
    if (compactMode === "hide-inactive" && activeKey) {
      posClass = "flex-col ";
      showBackBtn = true;
    }

    const activeItemIconPath =
      activeKey ? items[activeKey]?.leftIconPath : undefined;
    const activeKeyAndContent = !!(activeKey && items[activeKey]?.content);
    return (
      <div
        ref={(rootDiv) => {
          if (rootDiv) this.rootDiv = rootDiv;
        }}
        style={{
          ...style,
          ...(!variant && { opacity: 0 }),
        }}
        className={classOverride(
          "Tabs " + posClass + " min-w-0 min-h-0 f-1 ",
          className,
        )}
      >
        {showBackBtn ?
          <div
            className="flex-row ai-center"
            style={{ backgroundColor: "aliceblue" }}
          >
            <Btn
              iconPath={mdiArrowLeft}
              onClick={() => {
                this.setState({ activeKey: null });
                if (onChange) {
                  onChange(undefined);
                }
              }}
            >
              {activeKey}
            </Btn>
            {activeItemIconPath && (
              <Icon
                className="text-2 mr-1"
                path={activeItemIconPath}
                size={1}
              />
            )}
          </div>
        : <MenuList
            style={{
              zIndex: 1,
              ...(isObject(this.props.variant) && { borderRadius: 0 }),
              ...menuStyle,
            }}
            /* Ensure active items without content do not take white space to right */
            className={classOverride(
              `Tabs_Menu ${activeKeyAndContent ? "bg-color-1 shadow" : "max-w-unset"} f-0 w-full noselect`,
              listClassName,
            )}
            variant={
              controlsCollapsed ? "dropdown" : (
                (variant?.replace("horizontal", "horizontal-tabs") as any)
              )
            }
            compactMode={this.props.compactMode === "hide-label"}
            activeKey={activeKey as any}
            items={Object.keys(items)
              .filter((k) => !items[k]!.hide)
              .map((key) => ({
                key,
                label: items[key]?.label || key,
                leftIconPath: items[key]?.leftIconPath,
                disabledText: items[key]?.disabledText,
                style: {
                  ...(key === activeKey ? activeItemStyle : itemStyle),
                  ...(items[key]?.style || {}),
                },
                listProps: items[key]?.listProps,
                onPress:
                  items[key]?.disabledText ?
                    undefined
                  : () => {
                      if (onChange) {
                        onChange(key);
                      }
                      this.setState({ activeKey: key });
                    },
              }))}
          />
        }
        {!activeContent ? null : (
          <div className={`Tabs_Content ${contentClass}`}>{activeContent}</div>
        )}
      </div>
    );
  }
}

export const TabsWithDefaultStyle = (props: Pick<TabsProps, "items">) => {
  const { activeSection, setSection } = useConnectionConfigSearchParams(
    getKeys(props.items) as any,
  );
  return (
    <div
      className="flex-col f-1 min-h-0 pt-1 w-full"
      style={{ maxWidth: "800px" }}
    >
      <Tabs
        style={{ minHeight: "100vh" }}
        menuStyle={{ maxHeight: undefined }}
        variant={{
          controlsBreakpoint: 200,
          contentBreakpoint: 500,
          controlsCollapseWidth: 350,
        }}
        className="f-1 shadow"
        activeKey={activeSection ?? props.items[0]?.key}
        onChange={(section) => {
          setSection({ section });
        }}
        items={props.items}
        contentClass="f-1 o-autdo flex-row jc-center bg-color-2 "
        onRender={(item) => (
          <div className="flex-col f-1 max-w-800 min-w-0 bg-color-0 shadow w-full">
            <h2 style={{ paddingLeft: "18px" }} className=" max-h-fit">
              {item.label}
            </h2>
            <div
              className={
                " f-1 o-auto flex-row " + (window.isLowWidthScreen ? "" : " ")
              }
              style={{
                alignSelf: "stretch",
              }}
            >
              {item.content}
            </div>
          </div>
        )}
      />
    </div>
  );
};
