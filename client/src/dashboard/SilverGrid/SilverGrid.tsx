import type { ReactElement } from "react";
import React from "react";
import RTComp from "../RTComp";

import Btn from "../../components/Btn";
import { classOverride, FlexRow } from "../../components/Flex";
import { SilverGridChild } from "./SilverGridChild";
import { SilverGridResizer } from "./SilverGridResizer";
import type { TreeLayout } from "./TreeBuilder";
import { TreeBuilder } from "./TreeBuilder";

import type {
  LayoutItem,
  LayoutConfig,
  LayoutGroup,
} from "@common/DashboardTypes";
export type {
  LayoutItem,
  LayoutConfig,
  LayoutGroup,
} from "@common/DashboardTypes";

export type CustomHeaderClassNames = {
  close: string;
  minimise: string;
  fullscreen: string;
  move: string;
};
export type ReactSilverGridNode = ReactElement<{
  "data-table-name": string | null;
  "data-type": "title" | "header-icons" | "content";
  "data-title"?: string;
}>;

export type SilverGridProps = {
  className?: string;
  style?: React.CSSProperties;
  layout: LayoutConfig | null;
  header?: CustomHeaderClassNames;
  onChange?: (newLayout: LayoutConfig) => void;
  onClose?: (
    childKey: string | number,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void | Promise<any>;
  hideButtons?: {
    minimize?: boolean;
    fullScreen?: boolean;
    close?: boolean;
    pan?: boolean;
    resize?: boolean;
  };
  children?: ReactSilverGridNode[];
  headerIcons?: ReactSilverGridNode[];
  _ref?: (ref: HTMLDivElement) => void;
  layoutMode: "fixed" | "editable";

  /**
   * Something to draw on top
   */
  overlay?: React.ReactNode;

  /**
   * Defaults to col
   */
  defaultLayoutType?: LayoutGroup["type"];
};
type S = {
  layout?: LayoutConfig;
  targetStyle: React.CSSProperties;
  minimized?: boolean;
};

export class SilverGridReact extends RTComp<SilverGridProps, S, any> {
  state: S = {
    layout: undefined,
    targetStyle: { display: "none" },
  };

  treeLayout?: TreeBuilder;
  onDelta = (dP: Partial<SilverGridProps> | undefined) => {
    const { layout, children = [], defaultLayoutType = "col" } = this.props;

    if (dP && ("layout" in dP || "children" in dP)) {
      if (layout) {
        this.treeLayout = new TreeBuilder({ ...layout }, this.onChange);
      }

      /* Check layout. Update if extra/missing items */
      if (
        !layout ||
        ((layout as LayoutGroup).items.length === 0 && children.length)
      ) {
        setTimeout(() => {
          this.onChange({
            id: "1",
            ...(defaultLayoutType === "tab" && { activeTabKey: undefined }),
            type: defaultLayoutType as any,
            size: 100,
            items: children.map((c, i) => ({
              id: c.props["data-key"] || i.toString(),
              tableName: c.props["data-table-name"],
              title: c.props["data-title"],
              type: "item",
              size: 20,
            })),
          });
        }, 0);

        return null;
      }

      const items = this.getItems(layout),
        itemIds = items.map((d) => d.id),
        orphans = children.filter(
          (c) => !itemIds.includes(c.props["data-key"]),
        ),
        emptyItemIds = Array.from(
          new Set(
            itemIds.filter(
              (id) => !children.find((c) => c.props["data-key"] == id),
            ),
          ),
        );

      /* Remove any empty layouts */
      if ("items" in layout) {
        const empty = this.treeLayout?.getLeafs(
          (t) => "items" in t && !t.items.length,
        );
        if (empty?.length) {
          empty.map((l) => {
            let _l: TreeLayout | undefined = l;
            while (_l) {
              const p = _l.parent;
              this.treeLayout?.remove(_l.id);
              if (p && "items" in p && !p.items.length && !p.isRoot) {
                _l = p;
              } else {
                (_l as any) = undefined;
              }
            }
          });

          return;
        }
      }

      if (orphans.length) {
        setTimeout(() => {
          let newLayout = { ...layout };
          if (newLayout.type === defaultLayoutType) {
            const totalSize = (newLayout.items as LayoutConfig[]).reduce(
              (a, v) => a + v.size,
              0,
            );
            newLayout.items = [
              ...orphans.map(
                (c, i) =>
                  ({
                    id: c.props["data-key"] || i,
                    title: c.props["data-title"],
                    tableName: c.props["data-table-name"],
                    type: "item",
                    size: totalSize / orphans.length,
                  }) satisfies LayoutItem,
              ),
              ...newLayout.items,
            ];
            /** Ensure the newly added view is shown */
            if (newLayout.type === "tab") {
              newLayout.activeTabKey = orphans[0]?.props["data-key"];
            }
          } else {
            newLayout.size = 50;
            newLayout = {
              id: "1",
              ...(defaultLayoutType === "tab" && { activeTabKey: undefined }),
              type: defaultLayoutType as any,
              size: 100,
              isRoot: true,
              items: orphans
                .map(
                  (c, i) =>
                    ({
                      id: c.props["data-key"] || i,
                      title: c.props["data-title"],
                      tableName: c.props["data-table-name"],
                      type: "item",
                      size: 50 / orphans.length,
                    }) satisfies LayoutItem,
                )
                .concat(newLayout as any),
            };
          }
          this.onChange(newLayout);
        }, 0);
      }
      if (children.length && emptyItemIds.length) {
        emptyItemIds.map((id) => {
          this.treeLayout?.remove(id);
        });
      }
    }
  };

  setTarget = (targetStyle: React.CSSProperties) => {
    this.setState({ targetStyle });
  };

  getRoot = (): HTMLElement => {
    if (!this.ref) throw "Unexpected";
    return this.ref;
  };

  isChangingLayout?: {
    layout: LayoutConfig;
    timeout: any;
  };
  onChange = (newLayout: LayoutConfig, isTemporary = false) => {
    const { onChange } = this.props;
    if (onChange && !isTemporary) {
      onChange({ ...newLayout });
      this.setState({ layout: undefined });
    } else {
      this.setState({ layout: newLayout });
    }
  };

  getItems = (
    layout: LayoutConfig | undefined = this.state.layout,
  ): LayoutItem[] => {
    let res = [];
    if (!layout) {
    } else if (layout.type === "item") {
      return [layout];
    } else {
      res = res.concat(...(layout.items.map(this.getItems) as any));
    }

    return res;
  };

  ref?: HTMLDivElement;
  refTarget?: HTMLDivElement;
  renderGrid = (
    layout: LayoutConfig | null = this.props.layout,
    _key?: string,
    _onChange?: (newLayout: LayoutConfig) => void,
  ) => {
    const {
      children: c,
      header,
      headerIcons = [],
      onClose,
      _ref,
      hideButtons,
      layoutMode,
    } = this.props;
    const { minimized } = this.state;
    const children = React.Children.toArray(c) as ReactSilverGridNode[];
    let content: React.ReactNode = null;

    if (!children.length || !layout) return null;
    const onChange = _onChange ?? this.onChange;
    const key = _key ?? layout.id;

    const getChildNode = (id: string | number) => {
      const res = children.find((c) => c.props["data-key"] == id);
      return res;
    };

    if (layout.type === "item") {
      const child = getChildNode(layout.id);
      const headerIcon =
        children.find(
          (c) =>
            c.props["data-key"] == layout.id &&
            c.props["data-type"] === "header-icons",
        ) || headerIcons.find((c) => c.props["data-key"] == layout!.id);

      return (
        <SilverGridChild
          key={key}
          activeTabKey={layout.id}
          layoutMode={layoutMode}
          title={child?.props["data-title"] || ""}
          hideButtons={hideButtons ?? {}}
          layout={layout}
          header={header}
          headerIcon={headerIcon}
          setTarget={this.setTarget}
          getRoot={this.getRoot}
          onClose={onClose}
          moveTo={(sourceId, itemId, parentType, insertBefore) => {
            this.treeLayout?.moveTo(sourceId, itemId, parentType, insertBefore);
          }}
          onChange={onChange}
          hasSiblings={children.some((c) => c.props["data-key"] != layout.id)}
        >
          {child}
        </SilverGridChild>
      );
    } else {
      content = [];

      if (layout.type === "tab") {
        const [firstItem] = layout.items;
        if (!firstItem) {
          return null;
        }
        const activeItem =
          layout.items.find((d) => d.id === layout.activeTabKey) ?? firstItem;
        const activeItemId = activeItem.id;
        const child = getChildNode(activeItemId) ?? (
          <FlexRow className="p-2 ai-center">
            Item not found
            <Btn
              color="action"
              onClick={() => {
                this.treeLayout?.remove(activeItemId);
              }}
            >
              Click to remove
            </Btn>
          </FlexRow>
        );

        const headerIcon = headerIcons.find(
          (c) => c.props["data-key"] == activeItemId,
        );

        const otherChildren: LayoutItem[] = layout.items.map((l) => ({
          ...l,
          title: getChildNode(l.id)?.props["data-title"],
        }));
        content = (
          <SilverGridChild
            key={key}
            activeTabKey={activeItemId}
            title={child.props["data-title"] || ""}
            headerIcon={headerIcon}
            siblingTabs={otherChildren}
            layoutMode={layoutMode}
            onClickSibling={(tabId) => {
              onChange({ ...layout, activeTabKey: tabId });
            }}
            hasSiblings={children.some(
              (c) => c.props["data-key"] != activeItemId,
            )}
            layout={firstItem}
            header={header}
            setTarget={this.setTarget}
            getRoot={this.getRoot}
            onClose={onClose}
            moveTo={(sourceId, itemId, parentType, insertBefore) => {
              this.treeLayout?.moveTo(
                sourceId,
                itemId,
                parentType,
                insertBefore,
              );
            }}
            onChange={(newLayout) => {
              onChange(newLayout);
            }}
            minimize={{
              value: !!minimized,
              toggle: () => {
                this.setState({ minimized: !minimized });
              },
            }}
            hideButtons={hideButtons ?? {}}
          >
            {child}
          </SilverGridChild>
        );
      } else {
        const items = layout.items.map((l) => {
          const nestedItemOnchange = (newLayout: LayoutConfig) => {
            const newItems = layout.items.map((l) => {
              if (l.id === newLayout.id) {
                return newLayout;
              }
              return l;
            });
            onChange({
              ...layout,
              items: newItems,
            });
          };
          return this.renderGrid(l, l.id, nestedItemOnchange);
        });
        items.map((c, i) => {
          (content as React.ReactNode[]).push(c);
          if (i < items.length - 1) {
            (content as React.ReactNode[]).push(
              <SilverGridResizer
                key={"resizer" + i}
                layoutMode={layoutMode}
                type={layout!.type as "col" | "row"}
                onChange={(prevSize, nextSize) => {
                  this.treeLayout?.update([prevSize, nextSize]);
                }}
              />,
            );
          }
        });
      }
    }

    const isMinimized = minimized && layout.type === "tab";

    return (
      <div
        ref={(r) => {
          if (r) {
            this.ref = r;
            if (_ref) _ref(r);
          }
        }}
        key={key}
        data-box-type={layout.type}
        data-box-id={layout.id}
        className={classOverride(
          "silver-grid-box flex-" + layout.type + " min-w-0 min-h-0",
        )}
        style={{
          flex: layout.size,
          display: "flex",
          ...(isMinimized && {
            height: `${40 + 8}px`,
            flex: "none",
            flexShrink: 1,
          }),
        }}
      >
        {content}
      </div>
    );
  };

  render() {
    const { targetStyle } = this.state;
    const { style = {}, className = "", overlay, layoutMode } = this.props;
    return (
      <div
        ref={(r) => {
          if (r) this.ref = r;
        }}
        className={classOverride(
          `silver-grid-component relative  ${layoutMode === "fixed" ? "p-1 bg-color-3" : ""}`,
          className,
        )}
        style={{
          display: "flex",
          flex: 1,
          height: "100%",
          width: "100%",
          ...style,
        }}
      >
        {this.renderGrid()}
        <div
          key={"silver-grid-target"}
          ref={(r) => {
            if (r) this.refTarget = r;
          }}
          className={" absolute silver-grid-target b"}
          style={{
            ...targetStyle,
            zIndex: 232,
            transition: ".2s all ease-in-out",
            background: "#dcffffb3",
          }}
        />
        {overlay}
      </div>
    );
  }
}

export function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}
