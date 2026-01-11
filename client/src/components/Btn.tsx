import { mdiAlert, mdiCheck } from "@mdi/js";
import { omitKeys, pickKeys } from "prostgles-types";
import React from "react";
import { NavLink } from "react-router";
import RTComp from "../dashboard/RTComp";
import type { TestSelectors } from "../Testing";
import { tout } from "../utils/utils";
import "./Btn.css";
import { parsedError } from "./ErrorComponent";
import { classOverride } from "./Flex";
import type { IconProps } from "./Icon/Icon";
import { Icon } from "./Icon/Icon";
import { Label, type LabelProps } from "./Label";
import Loading from "./Loader/Loading";
import Popup from "./Popup/Popup";

type ClickMessage = (
  | { err: any }
  | { ok: React.ReactNode; replace?: boolean }
  | { loading: 1 | 0; delay?: number }
) & { duration?: number };
type ClickMessageArgs = (msg: ClickMessage, onEnd?: () => void) => void;

type BtnCustomProps = (
  | {
      iconPath?: never;
      iconStyle?: never;
      iconProps?: never;
      iconClassname?: never;
      iconNode?: never;
    }
  | {
      iconPath?: string;
      iconStyle?: React.CSSProperties;
      iconProps?: IconProps;
      iconClassname?: string;
      iconNode?: React.ReactNode;
    }
) & {
  iconPosition?: "left" | "right";
  label?: LabelProps;

  /**
   * If provided then the button is disabled and will display a tooltip with this message
   */
  disabledInfo?: string;
  /**
   * no-fade - will not fade out the button when disabled/loading
   */
  disabledVariant?: "no-fade";
  loading?: boolean;
  fadeIn?: boolean;
  _ref?: React.RefObject<HTMLButtonElement>;

  size?: "large" | "default" | "small" | "micro" | "nano";
  variant?: "outline" | "filled" | "faded" | "icon" | "text" | "default";
  color?:
    | "danger"
    | "warn"
    | "action"
    | "inherit"
    | "transparent"
    | "white"
    | "green"
    | "indigo"
    | "default";

  "data-id"?: string;
  /**
   * If true then title will be used as children
   */
  titleAsLabel?: boolean;

  /**
   * If provided then will display a confirmation dialog before running any onClick function
   */
  clickConfirmation?: {
    color: "danger" | "action" | "warn";
    message: React.ReactNode;
    buttonText: string;
  };
} & (
    | {
        onClickMessage?: (
          e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
          showMessage: ClickMessageArgs,
        ) => void;
        onClickPromise?: undefined;
        onClickPromiseMode?: undefined;
      }
    | {
        onClickMessage?: undefined;
        onClickPromise?: (
          e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
        ) => Promise<void> | void;
        onClickPromiseMode?: "noTickIcon";
        /**
         * Will display it instead of the error message
         */
        onClickPromiseMessage?: React.ReactNode;
      }
  );
type KeysOfUnion<T> = T extends T ? keyof T : never;

type OmmitedKeys =
  | KeysOfUnion<BtnCustomProps>
  | "children"
  | "ref"
  | "onClick"
  | "style"
  | "title";
const CUSTOM_ATTRS: OmmitedKeys[] = [
  "iconPath",
  "children",
  "disabledInfo",
  "title",
  "disabledVariant",
  "onClick",
  "loading",
  "color",
  "fadeIn",
  "_ref",
  "ref",
  "style",
  "size",
  "iconProps",
  "iconNode",
  "iconPosition",
  "iconClassname",
  "onClickMessage",
  "onClickPromise",
  "onClickPromiseMessage",
  "onClickPromiseMode",
  //@ts-ignore
  "asNavLink",
  "iconStyle",
  "titleAsLabel",
  "clickConfirmation",
  "label",
];

export type BtnProps<HREF extends string | void = void> = TestSelectors &
  BtnCustomProps & {
    /**
     * If provided then will render as an anchor
     */
    href?: HREF;
    target?: string;
    asNavLink?: boolean;
    download?: boolean;
  } & React.HTMLAttributes<HTMLButtonElement> & {
    value?: string;
    type?: "button" | "submit";
  };

type BtnState = {
  show: boolean;
  clickMessage?: {
    type: "err" | "ok" | "loading";
    msg: React.ReactNode;
    replace?: boolean;
  };
  showClickConfirmation?: boolean;
};

export default class Btn<HREF extends string | void = void> extends RTComp<
  BtnProps<HREF>,
  BtnState
> {
  state: BtnState = {
    show: true,
  };

  timeOut?: NodeJS.Timeout;
  loadingTimeOut?: NodeJS.Timeout;

  latestMsg?: ClickMessage;
  clickMessage: ClickMessageArgs = (msg, onEnd) => {
    if (!this.mounted) return;
    this.latestMsg = msg;
    const hasErr = "err" in msg;
    if (this.loadingTimeOut) clearTimeout(this.loadingTimeOut);
    if (this.timeOut) clearTimeout(this.timeOut);

    if (hasErr) {
      this.setState({
        clickMessage: {
          type: "err",
          msg: parsedError(msg.err, true),
        },
      });
    } else if ("ok" in msg) {
      this.setState({
        clickMessage: {
          type: "ok",
          msg: msg.ok,
          replace: msg.replace,
        },
      });
    } else if ("loading" in msg) {
      if (!msg.loading) {
        this.setState({ clickMessage: undefined }, onEnd);
      } else {
        this.loadingTimeOut = setTimeout(() => {
          /** Check if msg is stale */
          if (
            this.mounted &&
            JSON.stringify(this.latestMsg) === JSON.stringify(msg)
          ) {
            this.setState({
              clickMessage: { type: "loading", msg: "" },
            });
          }
        }, msg.delay ?? 750);
      }

      return;
    }

    this.timeOut = setTimeout(
      () => {
        if (this.mounted) {
          this.setState({ clickMessage: undefined }, onEnd);
        }
      },
      msg.duration ?? (hasErr ? 5000 : 2000),
    );
  };

  setPromise = async (
    promise: ReturnType<Required<BtnProps>["onClickPromise"]>,
  ) => {
    this.clickMessage({ loading: 1, delay: 0 });
    const minDuration = 500;
    const startTime = Date.now();
    try {
      const res = await promise;
      const endTime = Date.now();
      const duration = endTime - startTime;
      if (!this.mounted) return;
      if (duration < minDuration) {
        await tout(Math.max(0, minDuration - duration));
      }
      this.clickMessage({ ok: "" });
    } catch (err) {
      this.clickMessage({
        err:
          ("onClickPromiseMessage" in this.props ?
            this.props.onClickPromiseMessage
          : undefined) ?? err,
      });
    }
  };

  render() {
    const {
      iconPath,
      iconPosition = "left",
      className = "",
      style = {},
      iconStyle = {},
      disabledInfo,
      disabledVariant,
      title,
      fadeIn,
      variant = "default",
      iconProps,
      iconNode,
      iconClassname = "",
      titleAsLabel,
      label,
      clickConfirmation,
      onClickPromiseMode,
      ...otherProps
    } = this.props;
    const { clickMessage, showClickConfirmation } = this.state;
    let extraStyle: React.CSSProperties = {};

    const color =
      (clickMessage?.type === "err" ? "danger"
      : clickMessage?.type === "ok" ? "action"
      : this.props.color) ?? "default";
    const loading =
      clickMessage?.type === "loading" ? true : (this.props.loading ?? false);
    const children =
      clickMessage?.msg || (titleAsLabel ? title : this.props.children);

    if (clickMessage?.replace) return clickMessage.msg;

    const isDisabled = disabledInfo || loading;
    let _className = "";
    const { size = window.isLowWidthScreen ? "small" : "default" } = this.props;

    const hasBgClassname = (className + "").includes("bg-");
    _className =
      " f-0 flex-row gap-p5 ai-center  " +
      ("href" in this.props ? " button-css " : "  ") +
      (variant === "outline" ? " b " : "");

    if (children && !iconNode && !iconPath && !loading) {
      if (variant === "outline") {
        if (!hasBgClassname)
          _className =
            _className.replace("bg-transparent", "") + " bg-color-0 ";
        extraStyle = {
          borderColor: "currentcolor",
        };
      }

      if (size === "micro") {
        extraStyle.padding = "5px";
      }

      if (size === "small") {
        extraStyle.padding = "6px 8px";
      }

      if (size === "default") {
        extraStyle.padding = "12px 14px";
      }
      if (size === "large") {
        extraStyle.padding = "12px";
      }

      if (variant === "text") {
        extraStyle.paddingLeft = 0;
      }
    } else {
      const padding =
        size === "nano" ? "0px"
        : size === "micro" ? "4px"
        : size === "small" ? "6px"
        : size === "default" ? "8px"
        : "10px";
      const sidePadding = children ? `calc(${padding} * 1.5)` : padding;
      /** Must add right padding to icon and text button */
      extraStyle = {
        padding: `${padding} ${sidePadding}`,
      };
    }

    _className +=
      (fadeIn ? " fade-in " : "") +
      (iconPath && !children ? "  " : "rounded") + // round
      (isDisabled ? ` disabled ${disabledVariant ? "no-fade" : ""} ` : " ");

    const loadingSize = {
      large: 22,
      default: 20,
      small: 14,
      micro: 12,
      nano: 10,
    }[size];
    const loadingMargin = {
      large: 1,
      default: 1,
      small: 0,
      micro: 2,
      nano: 0,
    }[size];
    const childrenContent =
      children === undefined || children === null || children === "" ? null
      : loading ?
        <div
          className="min-w-0 ws-nowrap text-ellipsis f-1 o-hidden flex-row"
          style={{ opacity: 0.5 }}
        >
          {children}
        </div>
      : children;

    const content = (
      <>
        {iconPosition === "right" && childrenContent}

        {!(iconPath || iconProps?.path || iconNode) || loading ? null : (
          (iconNode ?? (
            <Icon
              path={
                clickMessage?.type === "err" ? mdiAlert
                : (
                  clickMessage?.type === "ok" &&
                  onClickPromiseMode !== "noTickIcon"
                ) ?
                  mdiCheck
                : (iconPath ?? iconProps!.path)
              }
              sizeName={size}
              className={iconClassname + " f-0 "}
              style={iconStyle}
              {...iconProps}
            />
          ))
        )}

        {loading && (
          <Loading
            style={{ margin: `${loadingMargin}px` }}
            sizePx={loadingSize}
            delay={0}
            colorAnimation={false}
          />
        )}

        {iconPosition === "left" && childrenContent}
      </>
    );

    type PropsOf<E> = React.HTMLAttributes<E> & { ref?: React.Ref<E> };

    const needsConfirmation = () => {
      if (clickConfirmation && !showClickConfirmation) {
        this.setState({ showClickConfirmation: true });
        return true;
      }
      return false;
    };
    let onClick = this.props.onClick;
    if (this.props.onClickPromise) {
      const { onClickPromise } = this.props;
      onClick = (e) => {
        !needsConfirmation() && this.setPromise(onClickPromise(e));
      };
    } else if (this.props.onClickMessage) {
      const { onClickMessage } = this.props;
      onClick = (e) => {
        !needsConfirmation() && onClickMessage(e, this.clickMessage);
      };
    } else if (this.props.onClick) {
      onClick = (e) => {
        if (needsConfirmation()) return;
        this.props.onClick?.(e);
      };
    }

    if (size === "small") {
      extraStyle.minHeight = "32px";
      extraStyle.minWidth = "32px";
    }

    const FontSizeMap: Record<Required<BtnCustomProps>["size"], string> = {
      large: "16px",
      default: "16px",
      small: "14px",
      micro: "12px",
      nano: "10px",
    };

    const finalProps: PropsOf<HTMLAnchorElement> | PropsOf<HTMLButtonElement> =
      {
        ...omitKeys(this.props, CUSTOM_ATTRS as any),
        onClick:
          isDisabled ?
            !window.isMobileDevice ?
              undefined
            : () => alert(disabledInfo)
          : onClick,
        title: disabledInfo || title,
        style: {
          ...extraStyle,
          display: "flex",
          lineHeight: "1em",
          width: "fit-content",
          fontSize: FontSizeMap[size],
          ...style,
        },
        onMouseDown: (e) => e.preventDefault(),
        className: classOverride(
          `${_className} btn btn-${variant} btn-size-${size} btn-color-${color} ws-nowrap w-fit `,
          className,
        ),
        ref: this.props._ref as any,
        ...pickKeys(otherProps, ["data-id"]),
      };

    const withLabel = (content: React.ReactNode) => {
      if (label) {
        return (
          <div className="flex-col f-0 min-h-fit">
            <Label {...label} />
            {content}
          </div>
        );
      }
      return content;
    };

    if ("href" in this.props && this.props.href) {
      if (this.props.asNavLink) {
        return withLabel(
          <NavLink
            {...(finalProps as PropsOf<HTMLAnchorElement>)}
            onClick={
              !disabledInfo ? undefined : (
                (e) => {
                  e.preventDefault();
                }
              )
            }
            to={this.props.href}
            tabIndex={-1}
          >
            {content}
          </NavLink>,
        );
      }
      return withLabel(
        <a
          {...(finalProps as PropsOf<HTMLAnchorElement>)}
          target={this.props.target}
          onClick={disabledInfo ? undefined : () => false}
          {...(this.props.download && { download: true })}
        >
          {content}
        </a>,
      );
    }

    return withLabel(
      <>
        <button
          {...finalProps}
          data-color={color}
          disabled={isDisabled ? true : undefined}
        >
          {content}
        </button>
        {clickConfirmation && showClickConfirmation && (
          <Popup
            data-command="Btn.ClickConfirmation"
            onClickClose={false}
            onClose={() => this.setState({ showClickConfirmation: false })}
            clickCatchStyle={{ opacity: 1 }}
            footerButtons={[
              {
                label: "Cancel",
                onClickClose: true,
              },
              {
                label: clickConfirmation.buttonText,
                color: clickConfirmation.color,
                "data-command": "Btn.ClickConfirmation.Confirm",
                variant: "filled",
                className: "ml-auto",
                onClick: (e) => {
                  this.setState({ showClickConfirmation: false });
                  onClick?.(e);
                },
              },
            ]}
          >
            {clickConfirmation.message}
          </Popup>
        )}
      </>,
    );
  }
}
