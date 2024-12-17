import type { ReactElement } from "react";
import React from "react";
import { setPan } from "../setPan";
import { vibrateFeedback } from "../Dashboard/dashboardUtils";
import RTComp from "../RTComp";
import type {
  CustomHeaderClassNames,
  LayoutConfig,
  LayoutGroup,
  LayoutItem,
  ReactSilverGridNode,
  SilverGridProps,
} from "./SilverGrid";
import { SilverGridChildHeader } from "./SilverGridChildHeader";

export type SilverGridChildProps = {
  layout: LayoutItem;
  title?: string;
  children: ReactElement | undefined;
  header?: CustomHeaderClassNames;
  headerIcon?: ReactSilverGridNode;
  siblingTabs?: Partial<LayoutItem>[];
  hasSiblings: boolean;
  activeTabKey: string;
  onClickSibling?: (id: string) => void;
  setTarget: (newStyle: React.CSSProperties) => void;
  onChange: (newLayout: LayoutConfig) => void;
  getRoot: () => HTMLElement;
  onClose?: (
    childKey: string,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void | Promise<any>;
  moveTo: (
    sourceId: string,
    targetId: string,
    parentType: "row" | "col" | "tab",
    insertBefore: boolean,
  ) => void;
  minimize?: {
    value: boolean;
    toggle: VoidFunction;
  };
} & Required<Pick<SilverGridProps, "hideButtons" | "layoutMode">>;

type SilverGridChildState = {
  fullscreen: boolean;
  minimized?: boolean;
};

export class SilverGridChild extends RTComp<
  SilverGridChildProps,
  SilverGridChildState,
  any
> {
  state: SilverGridChildState = {
    fullscreen: false,
  };

  source?: {
    layout: LayoutItem;
    parentLayout: LayoutGroup;
  };
  target?: {
    node: HTMLElement;
    position: "tabDist" | "leftDist" | "rightDist" | "topDist" | "bottomDist";
  };

  loaded?: {
    headerRef: HTMLDivElement | null;
  };

  cleanupListeners?: VoidFunction;
  onDelta(
    deltaP: Partial<SilverGridChildProps> | undefined,
    deltaS: Partial<SilverGridChildState> | undefined,
    deltaD: any,
  ): void {
    const { header, setTarget, moveTo, hideButtons, layoutMode } = this.props;
    const container = this.ref?.closest(".silver-grid-component");

    if (!container || !this.ref || hideButtons.pan) {
      return;
    }
    const headerRef =
      this.refHeader ||
      this.ref.querySelector<HTMLDivElement>("." + header?.move);
    if (!headerRef) {
      throw "Header missing";
    }
    if (headerRef === this.loaded?.headerRef) {
      return;
    }
    this.loaded = { headerRef };

    if (layoutMode === "fixed") {
      this.cleanupListeners?.();
      return;
    }
    this.cleanupListeners = setPan(headerRef, {
      onPress: () => {
        if (!this.props.hasSiblings) return;
        vibrateFeedback(15);
      },
      onPanStart: () => {
        if (!this.props.hasSiblings) return;
        this.ref!.style.display = "none";
      },
      onPanEnd: () => {
        if (!this.props.hasSiblings) return;

        try {
          this.ref!.style.display = "flex";
          setTarget({ display: "none" });
          this.ref!.style.opacity = "";

          const { position: p, node: targetNode } = this.target!;
          let parentType: "row" | "col" | "tab" = "col";
          let insertBefore = true;

          if (p === "tabDist") {
            parentType = "tab";
            insertBefore = true;
          } else if (p === "leftDist") {
            parentType = "row";
            insertBefore = true;
          } else if (p === "rightDist") {
            parentType = "row";
            insertBefore = false;
          } else if (p === "topDist") {
            parentType = "col";
            insertBefore = true;
          } else {
            parentType = "col";
            insertBefore = false;
          }

          const targetId = targetNode.dataset["boxId"]!;

          moveTo(this.props.layout.id, targetId, parentType, insertBefore);
        } catch (e) {
          console.error(e);
        }
        this.target = undefined;
      },
      threshold: 55,
      onPan: (p) => {
        if (!this.props.hasSiblings) return;

        const { x, y } = p;
        const boxes = Array.from(container.querySelectorAll("[data-box-type]"))
          .map((node) => {
            const br = node.getBoundingClientRect();

            let hr,
              tabDist = Infinity;

            if (node.classList.contains("silver-grid-item")) {
              hr = node
                .querySelector(":scope > .silver-grid-item-header")
                ?.getBoundingClientRect();
              tabDist = Math.hypot(
                x - (hr.x + hr.width / 2),
                y - (hr.y + hr.height / 2),
              );
            }

            const leftDist = Math.hypot(
                x - (br.x + 0.25 * br.width),
                y - (br.y + 0.5 * br.height),
              ),
              rightDist = Math.hypot(
                x - (br.x + 0.75 * br.width),
                y - (br.y + 0.5 * br.height),
              ),
              topDist = Math.hypot(
                x - (br.x + 0.5 * br.width),
                y - (br.y + 0.25 * br.height),
              ),
              bottomDist = Math.hypot(
                x - (br.x + 0.5 * br.width),
                y - (br.y + 0.75 * br.height),
              );

            return {
              node,
              rect: br,
              hr,
              tabDist,
              leftDist,
              rightDist,
              topDist,
              bottomDist,
              minDist: Math.min(
                tabDist,
                leftDist,
                rightDist,
                topDist,
                bottomDist,
              ),
            };
          })
          .sort((a, b) => a.minDist - b.minDist);

        this.ref!.style.opacity = "0.3";
        const parentRect = container.getBoundingClientRect();
        const closest = boxes[0],
          cr = closest?.rect;

        if (!cr) {
          console.warn("onPan fail, closest not found");
          return;
        }

        let _x = cr.x - parentRect.x,
          _y = cr.y - parentRect.y,
          _w = cr.width / 2,
          _h = cr.height;

        this.target = {
          node: closest.node as HTMLElement,
          position: "leftDist",
        };
        if (closest.leftDist === closest.minDist) {
          _x = cr.x - parentRect.x;
          _y = cr.y - parentRect.y;
          _w = cr.width / 2;
          _h = cr.height;
          this.target.position = "leftDist";
        } else if (closest.rightDist === closest.minDist) {
          _x = cr.x - parentRect.x + cr.width / 2;
          _y = cr.y - parentRect.y;
          _w = cr.width / 2;
          _h = cr.height;
          this.target.position = "rightDist";
        } else if (closest.topDist === closest.minDist) {
          _x = cr.x - parentRect.x;
          _y = cr.y - parentRect.y;
          _w = cr.width;
          _h = cr.height / 2;
          this.target.position = "topDist";
        } else if (closest.bottomDist === closest.minDist) {
          _x = cr.x - parentRect.x;
          _y = cr.y - parentRect.y + cr.height / 2;
          _w = cr.width;
          _h = cr.height / 2;
          this.target.position = "bottomDist";
        } else if (closest.tabDist === closest.minDist) {
          _x = closest.hr.x - parentRect.x;
          _y = closest.hr.y - parentRect.y;
          _w = closest.hr.width;
          _h = closest.hr.height;
          this.target.position = "tabDist";
        }

        const thisR = this.ref!.getBoundingClientRect();
        if (
          closest.node === this.ref ||
          (_x - 2 >= thisR.x - parentRect.x &&
            _x + _w + 2 <= thisR.x - parentRect.x + thisR.width &&
            _y - 2 >= thisR.y - parentRect.y &&
            _y + _h + 2 <= thisR.y - parentRect.y + thisR.height)
        )
          return;

        setTarget({
          display: "block",
          width: `${_w}px`,
          height: `${_h}px`,
          transform: `translate(${_x}px, ${_y}px)`,
          border: "2px dashed #2d81ff",
        });

        // console.log(thisR)
      },
    });
  }

  onClickClose = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const { onClose, layout } = this.props;

    await onClose?.(layout.id, e);
  };

  get siblings() {
    const { getRoot } = this.props;
    return Array.from(
      getRoot().querySelectorAll<HTMLDivElement>('[data-box-type="item"]'),
    );
  }

  hasSiblingFullScreened = () => {
    const { getRoot } = this.props;
    return Boolean(
      this.ref &&
        getRoot().querySelector('[data-box-type="item"].fullscreen') &&
        getRoot().querySelector('[data-box-type="item"].fullscreen') !==
          this.ref,
    );
  };

  ref?: HTMLDivElement;
  refHeader?: HTMLDivElement;
  render() {
    const { children, header, layout, minimize } = this.props;
    const { fullscreen } = this.state;
    const minimized = minimize?.value ?? this.state.minimized;

    let content: any = children;

    const height = window.isMobileDevice ? 32 : 40;
    const isMinimized = !fullscreen && !minimize && minimized;

    if (!content) return null;
    if (!header) {
      content = (
        <>
          <SilverGridChildHeader
            {...this.props}
            height={height}
            onSetHeaderRef={(r) => {
              this.refHeader = r;
            }}
            onClickFullscreen={() => {
              this.setState({ fullscreen: !fullscreen });
            }}
            fullscreen={fullscreen}
            onClickClose={this.onClickClose}
            minimized={minimized}
            onSetMinimized={(minimized) => {
              this.setState({ minimized });
            }}
          />
          {isMinimized ? null : children}
        </>
      );
    }

    /** Used to ensure the SQL Editor suggestions overflow is visible */
    const setZindex = () => {
      if (!this.hasSiblingFullScreened()) {
        setTimeout(() => {
          this.siblings.forEach((n) => {
            if (n !== this.ref) {
              n.style.zIndex = "1";
            } else {
              n.style.zIndex = this.state.fullscreen ? "3" : "2";
            }
          });
        }, 100);
      }
    };

    /** Is used to ensure that clicks on overflowing content are not disabled */
    const isMyContent = (target: any) => this.ref?.contains(target as any);
    const isFixed = this.props.layoutMode === "fixed";
    return (
      <div
        ref={(r) => {
          if (r) this.ref = r;
        }}
        className={`SilverGridChild silver-grid-box silver-grid-item bg-color-1 f-1 flex-col min-w-0 min-h-0 ${fullscreen ? " fullscreen " : " "} ${isFixed ? "rounded shadow" : ""}`}
        data-box-id={layout.id}
        data-box-type="item"
        data-table-name={layout.tableName}
        /** Some content is overflowing over sibling windows. Ensure this overflow is visible */
        onClick={({ target }) => {
          if (isMyContent(target)) {
            setZindex();
          }
        }}
        style={{
          flex: layout.size,
          overflow: "hidden", // auto
          ...(isMinimized && {
            height: `${height + 8}px`,
            flex: "none",
            flexShrink: 1,
          }),
        }}
      >
        {content}
      </div>
    );
  }
}

type Box = { x: number; y: number; width: number; height: number };
export const getDistanceBetweenBoxes = (b1: Box, b2: Box) => {
  const startX = b1.x + b1.width / 2;
  const startY = b1.y + b1.height / 2;
  const endX = b2.x + b2.width / 2;
  const endY = b2.y + b2.height / 2;
  return Math.hypot(endX - startX, endY - startY);
};
