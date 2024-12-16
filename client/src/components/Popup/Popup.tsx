import type { ReactChild } from "react";
import React from "react";
import ReactDOM from "react-dom";
import "./Popup.css";

import type { Command, TestSelectors } from "../../Testing";
import RTComp, { type DeltaOf } from "../../dashboard/RTComp";
import { ClickCatchOverlay } from "../ClickCatchOverlay";
import ErrorComponent, { ErrorTrap } from "../ErrorComponent";
import { FlexRow, classOverride } from "../Flex";
import { FooterButtons, type FooterButton } from "./FooterButtons";
import { PopupHeader } from "./PopupHeader";
import { getPopupStyle } from "./getPopupStyle";
import { popupCheckPosition } from "./popupCheckPosition";
import { debounce } from "../../dashboard/Map/DeckGLWrapped";

let modalRoot;
export const getModalRoot = (forPointer = false) => {
  const id = forPointer ? "pointer-root" : "modal-root";
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("div");
    node.setAttribute("id", id);
    document.body.appendChild(node);
  }
  if (!forPointer) {
    modalRoot = node;
  }
  return node;
};
getModalRoot();

export const POPUP_CLASSES = {
  root: "popup-component-root",
  rootChild: "popup-component-root-child",
  title: "POPUP-TITLE",
  content: "POPUP-CONTENT",
};

/**
 * Must be above monaco editor minimap (z-index: 5)
 */
export const POPUP_ZINDEX = 5;
export type PopupProps = TestSelectors & {
  /**
   * On click away (click catch)
   */
  onClose?: (
    e:
      | KeyboardEvent
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void;
  title?: React.ReactNode;
  subTitle?: string;
  headerRightContent?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  rootChildClassname?: string;
  contentStyle?: React.CSSProperties;

  children?: React.ReactNode;
  clickCatchStyle?: React.CSSProperties;
  rootStyle?: React.CSSProperties;
  rootChildStyle?: React.CSSProperties;
  /**
   * Close popup on clicking content. Used for menus
   * */
  onClickClose?: boolean;
  footerButtons?:
    | FooterButton[]
    | ((popupClose: PopupProps["onClose"]) => FooterButton[]);
  anchorEl?: HTMLElement | Element;
  /**
   * Number of pixels to offset from anchor
   */
  anchorPadding?: number;
  anchorXY?: { x: number; y: number };
  positioning?:
    | "fullscreen"
    | "center"
    | "top-center"
    | "beneath-center"
    | "beneath-right"
    | "beneath-left"
    | "beneath-left-minfill"
    | "inside"
    | "tooltip"
    | "inside-top-center"
    | "above-center"
    | "as-is"
    | "right-panel";
  focusTrap?: boolean;
  /**
   * If true then top left corner position will change only for bigger content
   * Used to prevent content jumping
   */
  fixedTopLeft?: boolean;
  autoFocusFirst?: "header" | "content" | { selector: string };
  onKeyDown?: (e: KeyboardEvent, section: "header" | "content") => void;
  collapsible?: boolean;
  showFullscreenToggle?: {
    defaultValue?: boolean;
    getStyle?: (fullscreen: boolean) => React.CSSProperties;
  };
  persistInitialSize?: boolean;
};

const FOCUSABLE_ELEMS_SELECTOR =
  "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

export type PopupState = {
  prevStateStyle?: React.CSSProperties;
  stateStyle: React.CSSProperties;
  collapsed?: boolean;
  fullScreen?: boolean;
};

export default class Popup extends RTComp<PopupProps, PopupState> {
  el: HTMLElement = document.createElement("div");
  ref?: HTMLDivElement;

  state: PopupState = {
    stateStyle: {
      opacity: 0,
    },
    collapsed: false,
  };

  checkFocus = (e: KeyboardEvent) => {
    const { onClose, focusTrap = true, onKeyDown } = this.props;
    const isTheTopFocusedPopup = !this.ref?.parentElement?.nextSibling;
    if (!isTheTopFocusedPopup) {
      return;
    }

    if (onKeyDown) {
      onKeyDown(
        e,
        document.activeElement?.closest("header." + POPUP_CLASSES.title) ?
          "header"
        : "content",
      );
    }
    if (focusTrap && e.key === "Tab") {
      const fcsbl =
        this.el
          .querySelector("." + POPUP_CLASSES.root)
          ?.querySelectorAll<HTMLDivElement>(FOCUSABLE_ELEMS_SELECTOR) ?? [];
      if (e.shiftKey && document.activeElement === (fcsbl[0] as Node)) {
        e.preventDefault();
        if (fcsbl.length) fcsbl[fcsbl.length - 1]?.focus();
      }
      if (
        !e.shiftKey &&
        (document.activeElement === fcsbl[fcsbl.length - 1] ||
          !this.el.contains(document.activeElement))
      ) {
        e.preventDefault();
        if (fcsbl.length) {
          fcsbl[0]?.focus();
        }
      }
    }

    if (e.key === "Escape") {
      onClose?.(e);
    }
  };

  rObserver?: ResizeObserver;
  onMount() {
    this.el.classList.add("w-fit", "h-fit");
    if (modalRoot) modalRoot.appendChild(this.el);
    setTimeout(() => {
      this.checkPosition();
      const { autoFocusFirst } = this.props;
      if (!this.ref) return;
      if (autoFocusFirst) {
        const selector =
          typeof autoFocusFirst === "object" ?
            autoFocusFirst.selector
          : "." +
            (autoFocusFirst === "header" ?
              POPUP_CLASSES.title
            : POPUP_CLASSES.content);
        const container =
          this.ref.querySelector<HTMLDivElement>(selector) ?? this.ref;
        const firstInputLike = Array.from(
          container.querySelectorAll<
            HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement
          >('input:not([type="hidden"]), textarea, button'),
        );
        // const firstBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not([data-close-popup]),  a, [tabindex]:not([tabindex="-1"])'))

        const firstFocusable = [...firstInputLike].find(
          (e) =>
            getComputedStyle(e).display !== "none" &&
            getComputedStyle(e).opacity !== "0",
        );
        (firstFocusable ?? container).focus();
      }
    }, 50);
    window.document.body.addEventListener("keydown", this.checkFocus);

    if (!this.ref) return;
    this.rObserver = new ResizeObserver((a) => {
      const justToggledFullScreen = Date.now() - this.toggledFullScreen < 100;
      if (this.props.persistInitialSize || justToggledFullScreen) return;
      this.checkPosition();
    });

    this.rObserver.observe(this.ref);
  }

  toggledFullScreen = 0;
  onDelta(deltaP: DeltaOf<PopupProps>, deltaS: DeltaOf<PopupState>): void {
    if (deltaS && "fullScreen" in deltaS) {
      this.toggledFullScreen = Date.now();
    }
  }

  onUnmount() {
    if (modalRoot) {
      try {
        modalRoot.removeChild(this.el);
      } catch (e) {
        console.error(e);
      }
    }
    window.document.body.removeEventListener("keydown", this.checkFocus);
    if (this.ref) {
      this.rObserver?.unobserve(this.ref);
    }
  }

  position?: {
    x: number;
    y: number;
    /** Used for "center-fixed-top-left" positioning */
    xMin: number;
    yMin: number;
  };
  /**
   * Used to prevent size change jiggle and things moving
   */
  prevSize?: {
    width: number;
    height: number;
  };
  checkPosition = popupCheckPosition.bind(this);
  prevStateStyles: PopupState["stateStyle"][] = [];
  render() {
    const defaultContentClassName =
      this.props.title && !window.isLowWidthScreen ? "p-1 pl-2" : "p-1";
    const {
      onClose,
      positioning,
      content,
      children,
      clickCatchStyle = {},
      rootStyle = {},
      rootChildStyle = {},
      rootChildClassname,
      onClickClose,
      contentClassName = defaultContentClassName,
      contentStyle = {},
      showFullscreenToggle,
    } = this.props;

    const {
      stateStyle,
      collapsed = false,
      fullScreen = showFullscreenToggle?.defaultValue,
    } = this.state;
    const toggleContent = () => {
      this.setState({ collapsed: !collapsed });
    };
    const style = getPopupStyle({
      positioning,
      collapsed,
      fullScreen,
      stateStyle,
      rootStyle,
    });
    const fullHeightPositions: PopupProps["positioning"][] = [
      "right-panel",
      "fullscreen",
      undefined,
    ];

    const result = (
      <>
        {onClose && (
          <ClickCatchOverlay
            style={{
              position: "fixed",
              opacity: 0,
              zIndex: POPUP_ZINDEX,
              ...clickCatchStyle,
            }}
            className="ClickCatchOverlay absolute inset-0 flex-col"
            onClick={onClose}
          />
        )}

        <div
          className={`${POPUP_CLASSES.root} positioning:${positioning} card m-auto bg-popup${positioning === "right-panel" ? "-content" : ""} flex-col shadow-xl  o-hidden`}
          data-command={this.props["data-command"]}
          ref={(r) => {
            if (r) {
              this.ref = r;
            }
          }}
          onClick={
            !(onClickClose && onClose) ? undefined : (
              (e) => {
                if (window.getSelection()?.toString()) {
                  return;
                }
                onClose(e);
              }
            )
          }
          style={{
            boxSizing: "content-box",
            ...style,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div
            className={classOverride(
              `${POPUP_CLASSES.rootChild} w-full min-h-0 text-center flex-col bg-inherit ${fullHeightPositions.includes(positioning) ? "f-1" : ""}`,
              rootChildClassname,
            )}
            style={{
              ...rootChildStyle,
              ...showFullscreenToggle?.getStyle?.(!!fullScreen),
            }}
          >
            <PopupHeader
              {...this.props}
              onToggleFullscreen={() => {
                const newFullScreen = !fullScreen;
                if (!newFullScreen) {
                  this.position = undefined;
                }
                this.setState({ fullScreen: newFullScreen });
              }}
              toggleContent={toggleContent}
              collapsed={collapsed}
              fullScreen={fullScreen}
            />

            {!collapsed && (
              <div
                className={classOverride(
                  POPUP_CLASSES.content +
                    " bg-inherit flex-col f-1 min-h-0 o-auto ",
                  contentClassName,
                )}
                style={contentStyle}
                data-command={"Popup.content" satisfies Command}
              >
                <ErrorTrap>{content || children}</ErrorTrap>
              </div>
            )}
          </div>
          <FooterButtons {...this.props} />
        </div>
      </>
    );

    return ReactDOM.createPortal(result, this.el);
  }
}

type FooterProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  error?: any;
};
export const Footer = ({ children, className, style, error }: FooterProps) => {
  return (
    <ErrorTrap>
      <footer
        style={style}
        className={classOverride(
          "popup-footer bt b-color flex-row-wrap p-1 jc-end " +
            (window.isMobileDevice ? " gap-p5 " : " gap-1 "),
          className,
        )}
      >
        <ErrorComponent
          className="f-1"
          withIcon={true}
          variant="outlined"
          error={error}
          style={{ maxHeight: "150px", minHeight: 0, overflow: "auto" }}
        />
        <FlexRow>{children}</FlexRow>
      </footer>
    </ErrorTrap>
  );
};
