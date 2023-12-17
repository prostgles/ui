import React, { ReactChild } from 'react';
import ReactDOM from 'react-dom';
import "./Popup.css";

import { mdiClose, mdiFullscreen, mdiUnfoldLessHorizontal, mdiUnfoldMoreHorizontal } from '@mdi/js';
import RTComp from '../../dashboard/RTComp';
import { omitKeys } from '../../utils';
import Btn, { BtnProps } from '../Btn';
import ClickCatch from '../ClickCatch';
import { ErrorTrap } from "../ErrorComponent";
import { FooterButtons } from "./FooterButtons";
import { FlexCol, FlexRow, classOverride } from "../Flex";
import { TestSelectors } from '../../Testing';
import { popupCheckPosition } from "./popupCheckPosition";
let modalRoot = document.getElementById('modal-root');
if (!modalRoot) {
  modalRoot = document.createElement('div');
  modalRoot.setAttribute("id", 'modal-root');
  document.body.appendChild(modalRoot);
}

export type FooterButton = 
  (
    { node: React.ReactNode } 
  | {
    label: string;
    onClickClose?: boolean;
  } & BtnProps<void>
  ) | undefined;

export const POPUP_ROOT_CLASS = "popup-component-root";
export const POPUP_TITLE_CLASS = "POPUP-TITLE" as const;
export const POPUP_CONTENT_CLASS = "POPUP-CONTENT" as const;

export const POPUP_ZINDEX = 4;
export type PopupProps = TestSelectors & {
  /**
   * On click away (click catch)
   */
  onClose?: (e: KeyboardEvent |  React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  title?: React.ReactNode;
  subTitle?: string;
  headerRightContent?: React.ReactNode;
  content?: ReactChild;
  footer?: React.ReactNode;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;

  children?: React.ReactNode;
  clickCatchStyle?: React.CSSProperties;
  rootStyle?: React.CSSProperties;

  /** 
   * Close popup on clicking content. Used for menus 
   * */
  onClickClose?: boolean;
  footerButtons?: FooterButton[] | ((popupClose: PopupProps["onClose"]) => FooterButton[]);
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
  | "beneath-fill" 
  | "top-fill" 
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
  showFullscreenToggle?: { defaultValue?: boolean; getStyle?: (fullscreen: boolean) => React.CSSProperties; };
  persistInitialSize?: boolean;
}

const FOCUSABLE_ELEMS_SELECTOR = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]';

export type PopupState = {
  stateStyle: React.CSSProperties;
  collapsed?: boolean;
  fullScreen?: boolean;
}

export default class Popup extends RTComp<PopupProps, PopupState> {

  el: HTMLElement = document.createElement('div');
  ref?: HTMLDivElement;
  
  state: PopupState = {
    stateStyle: {
      opacity: 0
    },
    collapsed: false
  }

  checkFocus = (e: KeyboardEvent) => {
    const { onClose, focusTrap = true, onKeyDown } = this.props;
    const isTheTopFocusedPopup = !this.ref?.parentElement?.nextSibling;
    if(!isTheTopFocusedPopup) {
      return; 
    }

    if (onKeyDown) {
      onKeyDown(e, document.activeElement?.closest("header." + POPUP_TITLE_CLASS)? "header" : "content");
    }
    if (focusTrap && e.key === "Tab") {
      const fcsbl = this.el.querySelector("." + POPUP_ROOT_CLASS)?.querySelectorAll<HTMLDivElement>(FOCUSABLE_ELEMS_SELECTOR) ?? [];
      if (e.shiftKey && document.activeElement === fcsbl[0] as Node) {
        e.preventDefault();
        if (fcsbl.length) (fcsbl[fcsbl.length - 1])?.focus();
      }
      if (!e.shiftKey && (
        document.activeElement === fcsbl[fcsbl.length - 1] ||
        !this.el.contains(document.activeElement)
      )) {
        e.preventDefault();
        if (fcsbl.length) {
          fcsbl[0]?.focus();
        }
      }
    }

    if (e.key === "Escape") {
      onClose?.(e);
    }
  }

  rObserver?: ResizeObserver;
  onMount() {
    this.el.classList.add("w-fit", "h-fit")
    if (modalRoot) modalRoot.appendChild(this.el);
    setTimeout(() => {
      this.checkPosition();
      const { autoFocusFirst } = this.props;
      if(!this.ref) return;
      if(autoFocusFirst){
        const selector = typeof autoFocusFirst === "object"? autoFocusFirst.selector : ("." + (autoFocusFirst === "header"? POPUP_TITLE_CLASS : POPUP_CONTENT_CLASS)  )
        const container = this.ref.querySelector<HTMLDivElement>(selector) ?? this.ref;
        const firstInputLike = Array.from(container.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type="hidden"]), textarea, button'))
        // const firstBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not([data-close-popup]),  a, [tabindex]:not([tabindex="-1"])'))

        const firstFocusable = [...firstInputLike].find(e => getComputedStyle(e).display !== "none" && getComputedStyle(e).opacity !== "0");
        (firstFocusable ?? container).focus();
      }
    }, 50);
    window.document.body.addEventListener("keydown", this.checkFocus);

    if(!this.ref) return; 
    this.rObserver = new ResizeObserver((a) => {
      if(this.props.persistInitialSize) return;
      this.checkPosition();
    });

    this.rObserver.observe(this.ref);
  }

  onUnmount() {
    if (modalRoot) {
      try {
        modalRoot.removeChild(this.el);
      } catch (e) {
        console.error(e)
      }
    }
    window.document.body.removeEventListener("keydown", this.checkFocus);
    if(this.ref) {
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
  checkPosition = popupCheckPosition.bind(this);

  render() {
    const {
      onClose, positioning, title, content, children,
      clickCatchStyle = {}, rootStyle = {},
      onClickClose, contentClassName = "p-1 pl-2", contentStyle = {},
      collapsible, subTitle, showFullscreenToggle, headerRightContent
    } = this.props;

    const { stateStyle, collapsed = false, fullScreen = showFullscreenToggle?.defaultValue } = this.state;
    const toggleContent = () => {
      this.setState({ collapsed: !collapsed })
    }

    let rStyle = {};
    if (positioning === "tooltip") {
      rStyle = {
        pointerEvents: "none",
        touchAction: "none",
      }
    }
    let style: React.CSSProperties = {
      maxWidth: "100vw",
      maxHeight: "100vh",
      outline: "none",
      position: "fixed",
      // clipPath: "circle(1% at 50% 10%)",
      // transition: "clip-path .5s",
      zIndex: POPUP_ZINDEX,
      padding: 0,
      borderRadius: ".5em",
      ...rStyle,
      ...stateStyle,
      ...rootStyle,
    };

    if(fullScreen){
      style = {
        ...omitKeys(style, ["transform", "top", "left", "right", "bottom", "position", "inset", "width", "height"]),
        position: "fixed", 
        inset: 0, 
        width: "100vw", 
        height: "100vh",
      }
    }

    if(collapsed){
      style = omitKeys(style, ["bottom", "height"]);
    }

    const showTitle = !!title; // Avoid showing close btn for select
    if(title && !onClose){
      console.warn("Popup title will not be shown because onClose is not defined");
    }
    
    const result = (
      <>

        {!onClose ?
          null :
          <ClickCatch
            style={{ position: "fixed", opacity: 0, zIndex: POPUP_ZINDEX, ...clickCatchStyle }} // POPUP_ZINDEX - 1
            className="absolute inset-0 bg-gray-500 flex-col"
            onClick={onClose}
          />
        }

        <div className={POPUP_ROOT_CLASS + " card m-auto bg-0 flex-col shadow-xl  o-hidden"}
          data-command={this.props["data-command"]}
          ref={r => { if (r) { this.ref = r; } }}
          onClick={!(onClickClose && onClose)? undefined : e => { 
            if(window.getSelection()?.toString()){
              return;
            }
            onClose(e); 
          }}
          style={{ ...style, boxSizing: "content-box"}}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div className="w-full min-h-0 text-center flex-col f-1"
            style={{
              ...showFullscreenToggle?.getStyle?.(!!fullScreen)
            }}
          >

            {showTitle && 
              <header className={POPUP_TITLE_CLASS + " ml-2 py-p5 pr-p5 flex-row ai-center bb b-gray-300 gap-1"}>
                {collapsible && <Btn className="f-0" onClick={toggleContent} 
                  iconPath={!collapsed? mdiUnfoldLessHorizontal : mdiUnfoldMoreHorizontal} 
                  title="Collapse/Expand content" 
                />}
                  <FlexCol id="modal-headline"  
                    className={"ai-none jc-none f-1 font-20 noselect font-medium text-0 o-hidden text-ellipsis ta-left m-0 ws-nowrap py-p25 " + (collapsible? " pointer " : " ") }
                    onClick={collapsible? toggleContent : undefined}
                  >

                    <h4 className="m-0"
                      style={{ 
                        ...(collapsible? { paddingLeft: 0 } : {})
                      }}
                      title={typeof title === "string"? title : undefined}
                    >
                      {title}
                    </h4>
                    {subTitle && <h6 title={subTitle} className="font-14 m-0 text-ellipsis text-1" style={{ opacity: .7, maxWidth: "200px" }}>{subTitle}</h6>}
                  </FlexCol>
                  <FlexRow className="Popup-header-actions gap-0">
                    {headerRightContent}
                    {showFullscreenToggle && 
                      <Btn className="f-0" 
                        iconPath={mdiFullscreen} 
                        color={fullScreen? "action" : undefined}
                        onClick={() => {
                          this.setState({ fullScreen: !fullScreen  })
                        }} 
                      />
                    }
                    <Btn 
                      data-command="Popup.close"
                      data-close-popup={true} 
                      className="f-0" 
                      style={{ margin: "1px" }} 
                      iconPath={mdiClose} 
                      onClick={onClose} 
                    />
                  </FlexRow>
              </header>
            }

            {!collapsed && <div className={classOverride(POPUP_CONTENT_CLASS + " flex-col f-1 min-h-0 o-auto ", contentClassName)} //  o-auto 
              style={{
                borderRadius: ".5em",
                ...contentStyle,
              }}
            >
              <ErrorTrap>
                {content || children}
              </ErrorTrap>
            </div>}
          </div>
          <FooterButtons { ...this.props } />
        </div>
      </>
    );

    return ReactDOM.createPortal(
      result,
      this.el
    );
  }
}


type FooterProps = { 
  children: React.ReactNode; 
  className?: string;
  style?: React.CSSProperties;
}
export const Footer = ({ children, className, style}: FooterProps) => {
  return <ErrorTrap>
    <footer style={style} className={classOverride("popup-footer bt b-gray-200 flex-row-wrap p-1 jc-end " + (window.isMobileDevice? " gap-p5 " : " gap-1 "), className)}>
      {children}
    </footer>
  </ErrorTrap>
}