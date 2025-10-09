import React from "react";
import "./Loading.css";
import RTComp from "../dashboard/RTComp";
import { classOverride, FlexRow } from "./Flex";
import { tout } from "../utils";
import { SpinnerV2 } from "./SpinnerV2";
export const pageReload = async (reason: string) => {
  console.log("pageReload due to: ", reason);
  await tout(200);
  window.location.reload();
};

type P = {
  /* If provided will ensure continuity to the applied delays */
  id?: string;
  style?: React.CSSProperties;
  className?: string;
  variant?: "top-bar" | "cover";
  sizePx?: number;
  message?: string;
  colorAnimation?: boolean;
} & (
  | { show?: boolean; delay?: undefined }
  | { delay?: number; show?: undefined }
) &
  (
    | {
        /**
         * Used to call something if stuck on the same loading message
         */
        onTimeout?: {
          message?: string;
          run: VoidFunction;
          timeout: number;
        };
        /**
         * Used to refresh page if stuck on the same loading message
         */
        refreshPageTimeout?: undefined;
      }
    | {
        onTimeout?: undefined;
        refreshPageTimeout?: number;
      }
  );

const loaderIdLastShown: Record<string, number> = {};

type S = {
  ready: boolean;
  timeoutMessage?: string;
};
export default class Loading extends RTComp<P, S> {
  state: S = {
    ready: false,
  };
  mounted = false;

  get show() {
    const { delay = 500, id } = this.props;
    const wasShownRecently =
      id !== undefined &&
      loaderIdLastShown[id] &&
      Date.now() - loaderIdLastShown[id]! < delay;
    return !delay || wasShownRecently || this.state.ready;
  }

  onMount() {
    this.mounted = true;
    if ("show" in this.props) return;

    const { delay = 500, id } = this.props;
    if (delay && !this.show) {
      setTimeout(() => {
        if (this.mounted) {
          if (id) loaderIdLastShown[id] = Date.now();
          this.setState({ ready: true });
        }
      }, delay);
    } else {
      this.setState({ ready: true });
    }
  }

  onTimeout?: NodeJS.Timeout;
  onDelta(
    deltaP: Partial<P> | undefined,
    deltaS: Partial<{ ready: boolean }> | undefined,
    deltaD: { [x: string]: any } | undefined,
  ): void {
    if (deltaP?.onTimeout ?? deltaP?.refreshPageTimeout) {
      if (this.onTimeout) clearTimeout(this.onTimeout);

      const { onTimeout, message, refreshPageTimeout } = this.props;
      if (onTimeout || refreshPageTimeout) {
        this.onTimeout = setTimeout(() => {
          if (!this.mounted || this.props.message !== message) {
            return;
          }
          if (this.props.onTimeout) {
            console.log("onTimeout", message, this.props.message);
            this.props.onTimeout.run();
            if (this.props.onTimeout.message) {
              this.setState({ timeoutMessage: this.props.onTimeout.message });
            }
          } else {
            pageReload("Loader refreshPageTimeout");
          }
        }, onTimeout?.timeout ?? refreshPageTimeout!);
      }
    }
  }

  render() {
    const {
      style = {},
      className = "",
      variant,
      sizePx = 30,
      colorAnimation = false,
    } = this.props;
    const { show = this.show } = this.props;
    const size = sizePx + "px";

    const msg = this.state.timeoutMessage ?? this.props.message;
    const message = msg ? <div>{msg}</div> : null;

    // const delayStyle = { opacity: (!show) ? 0.0001 : 1 };
    const commonStyle = {
      display: !show ? "none" : undefined,
      cursor: "wait",
    };

    if (variant === "top-bar") {
      return (
        <div
          style={{
            position: "absolute",
            zIndex: 2,
            top: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: "6px",
            ...style,
            ...commonStyle,
          }}
          className={"top-bar-loader " + className}
        ></div>
      );
    }
    if (variant === "cover") {
      return (
        <>
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              inset: 0,
              width: "100%",
              height: "100%",
              ...commonStyle,
              ...(!className.includes("bg-") && {
                background: "rgba(255, 255, 255, .5)",
              }),
              ...style,
            }}
            className={classOverride(
              "cover-loader flex-row ai-center jc-center gap-1",
              className,
            )}
          >
            <FlexRow className="bg-color-0 rounded p-1 shadow">
              <Spinner size={size} colorAnimation={colorAnimation} />
              {message}
            </FlexRow>
          </div>
        </>
      );
    }

    const rootStyle: React.CSSProperties =
      !message ? { width: size, height: size } : {};

    return (
      <div
        style={{ ...style, ...rootStyle, ...commonStyle }}
        className={classOverride(
          "Loading spinner-loader ws-nowrap flex-row gap-1 ai-center ",
          className,
        )}
      >
        <Spinner size={size} colorAnimation={colorAnimation} />
        {message}
      </div>
    );
  }
}

/* 
  The spinner should keep laptop fans quiet.
  SVG is quiter than SpinnerV2.
  Test page: http://localhost:3004/component-list#d

  SVG: 
    60% cpu 20% gpu
  Canvas (SpinnerV2): 
    30% cpu 50% gpu
*/
const Spinner = ({ size }: { size: string; colorAnimation: boolean }) => {
  // return <SpinnerV2 size={size} />;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="Spinner f-0"
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <path
        xmlns="http://www.w3.org/2000/svg"
        fill="inherit"
        d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"
      />
    </svg>
  );
};
