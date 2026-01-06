import { isObject, pickKeys } from "prostgles-types";
import React from "react";
import ReactDOM from "react-dom";
import type { Command, TestSelectors } from "../../Testing";
import RTComp, { type DeltaOf } from "../../dashboard/RTComp";
import { ClickCatchOverlay } from "../ClickCatchOverlay";
import { ErrorTrap } from "../ErrorComponent";
import { classOverride } from "../Flex";
import {
  FooterButtons,
  type FooterButton,
  type FooterButtonsProps,
} from "./FooterButtons";
import "./Popup.css";
import { PopupHeader } from "./PopupHeader";
import { getPopupStyle } from "./getPopupStyle";
import { popupCheckPosition } from "./popupCheckPosition";

let modalRoot: HTMLElement | null = null;
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
  title?: React.ReactNode | ((rootDiv: HTMLDivElement) => React.ReactNode);
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
    | "left"
    | "right-panel";
  focusTrap?: boolean;
  /**
   * If true then top left corner position will change only for bigger content
   * Used to prevent content jumping
   */
  fixedTopLeft?: boolean;
  autoFocusFirst?: "header" | "content" | { selector: string };
  onKeyDown?: (e: KeyboardEvent, section: "header" | "content") => void;
  collapsible?:
    | boolean
    | {
        defaultValue: boolean;
      };
  showFullscreenToggle?: {
    defaultValue?: boolean;
    getStyle?: (fullscreen: boolean) => React.CSSProperties;
    getContentStyle?: (fullscreen: boolean) => React.CSSProperties;
  };
  persistInitialSize?: boolean;
  /**
   * Callback for when the popup content finished resizing
   */
  onContentFinishedResizing?: VoidFunction;
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

        const firstFocusable = [...firstInputLike].find((e) => {
          return (
            getComputedStyle(e).display !== "none" &&
            getComputedStyle(e).opacity !== "0" &&
            !e.closest("." + DATA_NULLABLE) &&
            !e.closest("." + DATA_HAS_VALUE)
          );
        });
        (firstFocusable ?? container).focus();
      }
    }, 200);
    window.document.body.addEventListener("keydown", this.checkFocus);

    if (!this.ref) return;
    this.rObserver = new ResizeObserver((a) => {
      const justToggledFullScreen = Date.now() - this.toggledFullScreen < 100;
      if (this.props.persistInitialSize || justToggledFullScreen) return;
      this.checkPosition();
    });

    this.rObserver.observe(this.ref);
  }

  /**
   * Added to improve performance when rendering a monaco editor with a lot of content fullscreen
   */
  setMainNodeVisibility = (visible: boolean) => {
    const mainNode = document.querySelector("main")!;
    const isVisible = mainNode.style.visibility !== "hidden";
    if (isVisible !== visible) {
      mainNode.style.visibility = visible ? "visible" : "hidden";
    }
  };

  toggledFullScreen = 0;
  onDelta(deltaP: DeltaOf<PopupProps>, deltaS: DeltaOf<PopupState>): void {
    if (deltaS && "fullScreen" in deltaS) {
      this.toggledFullScreen = Date.now();
    }
    this.setMainNodeVisibility(this.state.fullScreen !== true);
  }

  onUnmount() {
    this.setMainNodeVisibility(true);
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
    opacity: number;
  };
  /**
   * Used to prevent size change jiggle and things moving
   */
  prevSize?: {
    width: number;
    height: number;
  };

  /**
   * Allow the content to grow within the first 250ms before setting opacity to 1
   */
  mountedAt = Date.now();
  checkPositionOpacity = {
    started: Date.now(),
    done: false,
    timeout: undefined as ReturnType<typeof setTimeout> | undefined,
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
      collapsible,
    } = this.props;

    const collapsedDefaultValue =
      isObject(collapsible) ? collapsible.defaultValue : false;

    const {
      stateStyle,
      collapsed = collapsedDefaultValue,
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
    const contentFullScreenStyle = showFullscreenToggle?.getContentStyle?.(
      Boolean(fullScreen),
    );

    const result = (
      <>
        {/* Used to improve UX for onWaitForContentFinish */}
        {onClose && style.opacity !== 0 && (
          <ClickCatchOverlay
            style={{
              position: "fixed",
              opacity: 0,
              zIndex: POPUP_ZINDEX,
              ...clickCatchStyle,
            }}
            className="flex-col"
            onClick={onClose}
          />
        )}

        <div
          className={`${POPUP_CLASSES.root} positioning_${positioning} card m-auto bg-popup${positioning === "right-panel" ? "-content" : ""} flex-col shadow-xl  o-hidden`}
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
              ...showFullscreenToggle?.getStyle?.(Boolean(fullScreen)),
            }}
          >
            <PopupHeader
              {...this.props}
              rootDiv={this.ref}
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
                style={{
                  ...contentStyle,
                  ...contentFullScreenStyle,
                }}
                data-command={"Popup.content" satisfies Command}
              >
                <ErrorTrap>{content || children}</ErrorTrap>
              </div>
            )}
          </div>
          <FooterButtons
            {...pickKeys(this.props, [
              "footerButtons",
              "onClose",
              "footer",
              "onClose",
            ] satisfies (keyof FooterButtonsProps)[])}
            data-command="Popup.footer"
          />
        </div>
      </>
    );

    return ReactDOM.createPortal(result, this.el);
  }
}

export const DATA_NULLABLE = "data-nullable";
export const DATA_HAS_VALUE = "data-has-value";
