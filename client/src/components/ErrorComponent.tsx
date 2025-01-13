import { mdiAlertCircleOutline, mdiCancel, mdiClose } from "@mdi/js";
import type { ReactNode } from "react";
import React from "react";
import { isEmpty } from "../utils";
import { classOverride } from "./Flex";
import { Icon } from "./Icon/Icon";
import { isObject } from "../../../commonTypes/publishUtils";
import Btn from "./Btn";
import type { TestSelectors } from "../Testing";

type P = TestSelectors & {
  error: any;
  className?: string;
  noScroll?: boolean;
  style?: React.CSSProperties;
  pre?: boolean;
  findMsg?: boolean;
  withIcon?: boolean;
  maxTextLength?: number;
  title?: string;
  variant?: "outlined";
  color?: "warning" | "action" | "info";
  onClear?: VoidFunction;
  children?: ReactNode;
};
export default class ErrorComponent extends React.Component<P> {
  ref?: any;

  static parsedError = (val, findMsg?: boolean): string => {
    let res = "";

    if (typeof val === "string") res = val;
    else if (Array.isArray(val)) {
      res = val.map((v) => ErrorComponent.parsedError(v)).join("\n");
    } else if (val && !isEmpty(val) && Object.keys(val).length) {
      if (findMsg) {
        res = getErrorMessage(val);
      }
      if (!res)
        res = Object.keys(val)
          .map((k) => `${k}: ${JSON.stringify(val[k], null, 2)}`)
          .join("\n");
    } else if (val?.toString) res = val.toString();
    else res = JSON.stringify(val);

    if (typeof res === "string" && res.length) {
      res = res.trim();
      if (res.startsWith('"') && res.endsWith('"')) res = res.slice(1, -1);
      if (res.toLowerCase().startsWith("error: ")) res = res.slice(7);
      // res = res.replace(/['"]+/g, '');
      res = res.replace(/\\"/g, '"');
    }
    return res;
  };

  scrollIntoView = () => {
    const { error } = this.props;
    if (error && this.ref && this.ref.scrollIntoView) {
      if (this.ref.scrollIntoViewIfNeeded) {
        this.ref.scrollIntoViewIfNeeded();
      } else this.ref.scrollIntoView();
    }
  };
  componentDidMount() {
    this.scrollIntoView();
  }
  componentDidUpdate() {
    this.scrollIntoView();
  }
  render() {
    const {
      error,
      className = "",
      style = {},
      pre = false,
      findMsg = false,
      withIcon = false,
      maxTextLength = 1000,
      title,
      noScroll = false,
      variant,
      color,
      onClear,
      children,
      ...testSelectors
    } = this.props;

    if ([null, undefined].includes(error)) {
      return null;
    }
    const colorClass = color ? `text-${color}` : "text-danger";
    return (
      <div
        ref={(e) => {
          if (e) this.ref = e;
        }}
        className={classOverride(
          `ErrorComponent relative flex-row ai-center text-danger p-1 o-auto min-w-0 min-h-0 o-auto ${colorClass} ${pre ? " ws-pre " : ""}`,
          className,
        )}
        {...testSelectors}
        style={{
          whiteSpace: "pre-line",
          textAlign: "left",
          display: !error ? "none" : "flex",
          ...(!className.includes("p-") && { padding: "0 4px" }),
          ...style,
          minWidth: "150px", // To ensure it shows on mobile
          ...(variant === "outlined" && {
            border: `1px solid var(--${colorClass})`,
            borderRadius: "var(--rounded)",
            padding: ".5em 1em",
          }),
          ...(noScroll ?
            { overflow: "hidden" }
          : {
              alignItems: "unset",
            }),
        }}
      >
        {withIcon && (
          <Icon
            size={1}
            className="mr-1 as-start"
            path={mdiAlertCircleOutline}
          />
        )}
        <div className={"flex-col gap-1 " + (noScroll ? "ws-break" : "o-auto")}>
          {title && <div className="font-18 bold">{title}</div>}
          {(ErrorComponent.parsedError(error, findMsg) + "").slice(
            0,
            maxTextLength,
          )}
        </div>
        {onClear && (
          <Btn
            className="ml-p5"
            onClick={onClear}
            iconPath={mdiClose}
            variant="faded"
            color="danger"
            size="small"
          />
        )}
      </div>
    );
  }
}

export class ErrorTrap extends React.Component<
  { children: ReactNode },
  { error: any; errorInfo: any }
> {
  state = {
    error: "",
    errorInfo: "",
  };

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    const { error, errorInfo } = this.state;
    const compName = (this.props.children as any)?.type?.name;
    let errVal: any = {
      error,
      stack: (errorInfo as any)?.componentStack || errorInfo,
    };
    if (compName) {
      errVal = {
        component: compName,
        ...errVal,
      };
    }
    if (error)
      return <ErrorComponent error={errVal} className="bg-color-0 p-2" />;

    return this.props.children;
  }
}

export const getErrorMessage = (e: any) => {
  const msgFields = [
    "err_msg",
    "message",
    "details",
    "constraint",
    "txt",
    "hint",
  ];
  if (typeof e === "string") return e;
  if (isObject(e)) {
    const errorMessage = msgFields.find(
      (f) => typeof (e[f] ?? e.err?.[f]) === "string",
    );
    if (errorMessage) return e[errorMessage] ?? e.err?.[errorMessage];
  }
  return e ? JSON.stringify(e) : "Error";
};
