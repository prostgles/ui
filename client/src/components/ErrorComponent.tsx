import { mdiAlertOutline, mdiClose } from "@mdi/js";
import type { ReactNode } from "react";
import React from "react";
import { isObject } from "@common/publishUtils";
import type { TestSelectors } from "../Testing";
import { isEmpty, scrollIntoViewIfNeeded } from "../utils/utils";
import Btn from "./Btn";
import { classOverride, FlexCol, FlexRow } from "./Flex";
import { Icon } from "./Icon/Icon";
import { getSerialisableError, includes, isEqual } from "prostgles-types";
import Markdown from "react-markdown";

type P = TestSelectors & {
  error: unknown;
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
  /**
   * Auto scroll into view when error is shown
   * Default: true
   */
  autoScrollIntoView?: boolean;
  renderAsMarkdown?: boolean;
};
export default class ErrorComponent extends React.Component<P> {
  ref?: HTMLDivElement;

  scrollIntoView = () => {
    const { error, autoScrollIntoView = true } = this.props;
    if (error && autoScrollIntoView && this.ref) {
      scrollIntoViewIfNeeded(this.ref);
    }
  };
  componentDidMount() {
    this.scrollIntoView();
  }

  componentDidUpdate(prevProps: P) {
    if (!isEqual(this.props.error, prevProps.error)) {
      this.scrollIntoView();
    }
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
      autoScrollIntoView,
      title,
      noScroll = false,
      variant,
      color,
      onClear,
      children,
      renderAsMarkdown,
      ...testSelectors
    } = this.props;

    if (includes([null, undefined], error)) {
      return null;
    }
    const colorClass = color ? `text-${color}` : "text-danger";
    const errorStr = (parsedError(error, findMsg) + "").slice(0, maxTextLength);
    return (
      <FlexRow
        ref={(e) => {
          if (e) this.ref = e;
        }}
        className={classOverride(
          `ErrorComponent relative p-p5 gap-1 ai-center text-danger p-1 o-auto min-w-0 min-h-0 o-auto variant:${variant} ${colorClass} ${pre ? " ws-pre " : ""}`,
          className,
        )}
        data-command="ErrorComponent"
        {...testSelectors}
        style={{
          whiteSpace: "pre-line",
          textAlign: "left",
          display: !(error as unknown) ? "none" : "flex",
          maxWidth: "min(600px, 100vw)",
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
        {withIcon && <Icon className="as-start f-0" path={mdiAlertOutline} />}
        <FlexCol
          className={
            "gap-p5 as-center-thisbreakslongerrors " +
            (noScroll ? "ws-break" : "o-auto")
          }
        >
          {title && <div className="font-16 bold">{title}</div>}
          {renderAsMarkdown ?
            <Markdown>{errorStr}</Markdown>
          : errorStr}
        </FlexCol>
        {onClear && (
          <Btn
            onClick={onClear}
            iconPath={mdiClose}
            variant="faded"
            color="danger"
            size="small"
          />
        )}
      </FlexRow>
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
      return (
        <ErrorComponent
          error={errVal}
          className="bg-color-0 p-2"
          style={{ maxHeight: "400px" }}
        />
      );

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

    /**
     * Postgres error code for unique constraint violation.
     * Detail is more useful than message in this case.
     */
    if (
      e.code === "23505" &&
      typeof e.message === "string" &&
      e.message.includes("duplicate key") &&
      typeof e.detail === "string"
    ) {
      return e.detail;
    }

    if (errorMessage) {
      return e[errorMessage] ?? e.err?.[errorMessage];
    }
  }
  return e ? JSON.stringify(e) : "Error";
};

/**
 * Return a more human readable error message if it's an object
 */
export const parsedError = (rawVal, findMsg?: boolean): string => {
  const val = getSerialisableError(rawVal);
  let res = "";

  if (typeof val === "string") res = val;
  else if (Array.isArray(val)) {
    res = val.map((v) => parsedError(v)).join("\n");
  } else if (val && !isEmpty(val) && Object.keys(val).length) {
    if (findMsg) {
      res = getErrorMessage(val);
    }
    if (!res)
      res = Object.entries(val)
        .map(
          ([k, v]) =>
            `${k}: ${JSON.stringify(getSerialisableError(v), null, 2)}`,
        )
        .join("\n");
  } else if (val?.toString) res = (val as any).toString();
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
