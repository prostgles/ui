import React, { useEffect } from "react";
import "./Animations.css";
import type { TestSelectors } from "../Testing";
import { classOverride } from "./Flex";
import { useIsMounted } from "../dashboard/Backup/CredentialSelector";

export type DivProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;
export class Success extends React.Component<DivProps> {
  render() {
    const { className = "" } = this.props;

    return (
      <div
        {...this.props}
        className={"custom-animations success-checkmark " + className}
      >
        <div className="check-icon">
          <span className="icon-line line-tip"></span>
          <span className="icon-line line-long"></span>
          <div className="icon-circle"></div>
          <div className="icon-fix"></div>
        </div>
      </div>
    );
  }
}

export class SuccessSVG extends React.Component<React.SVGProps<SVGSVGElement>> {
  render() {
    const { className = "" } = this.props;

    return (
      <svg
        {...this.props}
        className={"custom-animations checkmark " + className}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 52 52"
      >
        <circle
          className="checkmark__circle"
          cx="26"
          cy="26"
          r="25"
          fill="none"
        />
        <path
          className="checkmark__check"
          fill="none"
          d="M14.1 27.2l7.1 7.2 16.7-16.8"
        />
      </svg>
    );
  }
}

const miniStyle = {
  transform: `scale(0.5) translate(-50%, -50%)`,
  width: "40px",
  height: "40px",
};

export const SuccessMini = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex-col">
      <Success style={miniStyle} />
      <div>{children}</div>
    </div>
  );
};

type FlashMessageProps = {
  message: string;
  duration?: {
    millis: number;
    onEnd: VoidFunction;
  };
  variant?: "small";
} & TestSelectors &
  Pick<DivProps, "className" | "style">;

export const SuccessMessage = ({
  message,
  className = "",
  duration,
  variant,
  ...divProps
}: FlashMessageProps) => {
  const getIsMounted = useIsMounted();
  useEffect(() => {
    if (duration) {
      const timeout = setInterval(() => {
        if (!getIsMounted()) return;

        duration.onEnd();
      }, duration.millis);

      return () => clearInterval(timeout);
    }
  }, [duration, getIsMounted]);

  return (
    <div
      {...divProps}
      className={classOverride(
        "SuccessMessage text-green p-1 flex-col jc-center ai-center o-hidden gap-p5",
        className,
      )}
    >
      <div className={"text-green p-1 flex-col "}>{message}</div>
      <Success style={!variant ? {} : miniStyle} />
    </div>
  );
};
