import React, { useState } from "react";
import { omitKeys } from "prostgles-types";
import Loading from "./Loading";
import "./Btn.css";
import RTComp from "../dashboard/RTComp";
import ErrorComponent from "./ErrorComponent";
import { generateUniqueID } from "./FileInput/FileInput";
import { NavLink } from "react-router-dom";
import { mdiAlert, mdiCheck, mdiUpload } from "@mdi/js";
import type { IconProps } from "./Icon/Icon";
import { Icon } from "./Icon/Icon";
import Chip from "./Chip";
import { classOverride } from "./Flex";
import type { TestSelectors } from "../Testing";
import { tout } from "../pages/ElectronSetup";
import { Label, type LabelProps } from "./Label";

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
  disabledVariant?: "no-fade";
  loading?: boolean;
  fadeIn?: boolean;
  _ref?: React.RefObject<HTMLButtonElement>;

  /**
   * If provided will override existing top classname
   */
  exactClassName?: string;
  size?: "large" | "medium" | "small" | "micro";
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
} & (
    | {
        onClickMessage?: (
          e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
          showMessage: ClickMessageArgs,
        ) => void;
        onClickPromise?: undefined;
      }
    | {
        onClickMessage?: undefined;
        onClickPromise?: (
          e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
        ) => Promise<void>;
        /**
         * Will display it instead of the error message
         */
        onClickPromiseMessage?: React.ReactNode;
      }
  );

type OmmitedKeys =
  | keyof BtnCustomProps
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
  "exactClassName",
  "iconProps",
  "iconNode",
  "iconPosition",
  "iconClassname",
  "onClickMessage" as any,
  "onClickPromise" as any,
  "onClickPromiseMessage" as any,
  "asNavLink" as any,
  "iconStyle",
  "titleAsLabel",
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
          msg: ErrorComponent.parsedError(msg.err, true),
        },
      });
    } else if ("ok" in msg) {
      this.setState({
        clickMessage: { type: "ok", msg: msg.ok, replace: msg.replace },
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
            this.setState({ clickMessage: { type: "loading", msg: "" } });
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

  setPromise = async (promise: Promise<any>) => {
    this.clickMessage({ loading: 1, delay: 0 });
    const minDuration = 500;
    const startTime = Date.now();
    try {
      await promise;
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
      disabledVariant = "",
      title,
      fadeIn,
      exactClassName,
      variant = "default",
      iconProps,
      iconNode,
      iconClassname = "",
      titleAsLabel,
      label,
      ...otherProps
    } = this.props;
    const { clickMessage } = this.state;
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
    let _className = exactClassName || "";
    const { size = window.isLowWidthScreen ? "small" : "large" } = this.props;

    if (!exactClassName) {
      const hasBgClassname = (className + "").includes("bg-");
      _className =
        " f-0 flex-row gap-p5 ai-center  " +
        ("href" in this.props ? " button-css " : "  ") +
        (variant === "outline" ? " b " : "");

      if (children) {
        if (variant === "outline") {
          if (!hasBgClassname)
            _className =
              _className.replace("bg-transparent", "") + " bg-color-0 ";
          extraStyle = {
            borderColor: "currentcolor",
          };
        }

        if (size === "micro") {
          extraStyle.padding = iconPath || loading ? `2px 6px` : "2px 4px";
        }

        if (size === "small") {
          extraStyle.padding = iconPath || loading ? `2px 8px` : "2px 8px";
        }

        if (size === "medium") {
          extraStyle.padding = iconPath || loading ? `6px 10px` : "10px";
        }
        if (size === "large") {
          extraStyle.padding = iconPath || loading ? `8px 12px` : "12px";
        }

        if (variant === "text") {
          extraStyle.paddingLeft = 0;
        }

        /** Is icon Btn */
      } else {
        extraStyle = {
          padding:
            size === "micro" ? "2px"
            : size === "small" ? "4px"
            : size === "medium" ? "6px"
            : "8px",
        };

        if (variant === "icon" || variant === "outline") {
          extraStyle.padding = "0.5em";
        }
      }
    }

    _className +=
      (fadeIn ? " fade-in " : "") +
      (iconPath && !children ? "  " : "rounded") + // round
      (isDisabled ? ` disabled ${disabledVariant} ` : " ");

    _className = classOverride(_className, className);

    const loadingSize = {
      large: 22,
      medium: 18,
      small: 12,
      micro: 12,
    }[size];
    const loadingMargin = {
      large: 1,
      medium: 3,
      small: 4,
      micro: 3,
    }[size];
    const childrenContent =
      children === undefined || children === null || children === "" ? null
      : loading ?
        <div
          className="min-w-0 ws-nowrap text-ellipsis f-0 o-hidden"
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
                : clickMessage?.type === "ok" ?
                  mdiCheck
                : (iconPath ?? iconProps!.path)
              }
              size={size === "micro" ? 0.75 : 1}
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

    let onClick = this.props.onClick as any;
    if ("onClickPromise" in this.props && this.props.onClickPromise) {
      const { onClickPromise } = this.props;
      onClick = (e) => {
        this.setPromise(onClickPromise(e));
      };
    } else if ("onClickMessage" in this.props && this.props.onClickMessage) {
      const { onClickMessage } = this.props;
      onClick = (e) => {
        onClickMessage(e, this.clickMessage);
      };
    }

    if (size === "small") {
      extraStyle.minHeight = "32px";
      extraStyle.minWidth = "32px";
    }

    const FontSizeMap: Record<Required<BtnCustomProps>["size"], string> = {
      large: "16px",
      medium: "16px",
      small: "14px",
      micro: "12px",
    };

    const finalProps: PropsOf<HTMLAnchorElement> | PropsOf<HTMLButtonElement> =
      {
        ...omitKeys(this.props, CUSTOM_ATTRS as any),
        onClick:
          disabledInfo ?
            !window.isMobileDevice ?
              undefined
            : () => alert(disabledInfo)
          : loading ? undefined
          : onClick,
        title: disabledInfo || title,
        style: {
          ...extraStyle,
          display: "flex",
          lineHeight: "1em",
          width: "fit-content",
          ...style,
          fontSize: FontSizeMap[size],
        },
        onMouseDown: (e) => e.preventDefault(),
        className: `${_className} btn btn-${variant} btn-size-${size} btn-color-${color} ws-nowrap w-fit `,
        ref: this.props._ref as any,
        ...{ "data-id": otherProps["data-id"] as any },
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
      <button
        {...(finalProps as PropsOf<HTMLButtonElement>)}
        disabled={disabledInfo ? true : undefined}
      >
        {content}
      </button>,
    );
  }
}

type FileBtnProps = {
  iconPath?: string;
  children: React.ReactChild;
};

export const FileBtn = React.forwardRef<
  HTMLInputElement,
  FileBtnProps & React.HTMLProps<HTMLInputElement>
>(
  (
    {
      iconPath = mdiUpload,
      onChange,
      children = "Choose file",
      id = generateUniqueID(),
      style = {},
      className = "",
      ...inputProps
    },
    ref,
  ) => {
    const [files, setFiles] = useState<FileList | null>(null);

    // return (<label htmlFor={id} className={"text-1p5 f-1 flex-row pointer gap-p25 ai-center px-p5 py-p25 " + className} style={style}>
    //   {iconPath && <Icon path={iconPath} size={1} title="Add files" className="  "/>}
    //   {children}
    //   <Btn></Btn>
    //   <div className="flex-row-wrap gap-p5">
    //     {!files?.length? "No file chosen" : Array.from(files).map(f => <Chip>{f.name}</Chip>)}
    //   </div>
    //   <input id={id}
    //     ref={ref}
    //     style={{ width: 0, height: 0 }}
    //     {...inputProps}
    //     onChange={e => {
    //       setFiles(e.target.files);
    //       onChange?.(e);
    //     }}
    //     type="file"
    //   />
    // </label>)

    return (
      <div className={"flex-row  gap-p25 ai-center " + className} style={style}>
        <Btn
          title="Choose file"
          color="action"
          data-command="FileBtn"
          iconPath={iconPath}
          style={{ borderRadius: 0 }}
          onClick={(e) => {
            e.currentTarget.querySelector("input")?.click();
          }}
        >
          {children}
          <input
            id={id}
            ref={ref}
            type="file"
            autoCapitalize="off"
            style={{ width: 0, height: 0, position: "absolute" }}
            {...inputProps}
            onChange={(e) => {
              setFiles(e.target.files);
              onChange?.(e);
            }}
          />
        </Btn>
        <div className="flex-row-wrap gap-p5 text-1p5 px-1">
          {!files?.length ?
            "No file chosen"
          : Array.from(files).map((f) => <Chip key={f.name}>{f.name}</Chip>)}
        </div>
      </div>
    );
  },
);
