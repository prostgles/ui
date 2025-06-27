import React, { useEffect } from "react";
import type { TestSelectors } from "../Testing";
import { setPan, type PanListeners } from "../dashboard/setPan";

type PanProps = TestSelectors &
  PanListeners & {
    /** Setting zIndex AND position absolute allows "clicking" through any popups that obscure this element */
    style?: Omit<React.CSSProperties, "zIndex">;
    className?: string;
    threshold?: number;
    children?: React.ReactNode;
  };

export const Pan = (props: PanProps) => {
  const {
    style,
    className,
    children,
    id,
    onPanStart,
    onPan,
    onDoubleTap,
    threshold,
    onPanEnd,
    onRelease,
    onPress,
  } = props;
  const ref = React.useRef<HTMLDivElement>(null);
  if ((style as React.CSSProperties | undefined)?.zIndex !== undefined) {
    throw new Error(
      "Setting zIndex AND position absolute allows clicking through any popups that obscure this element.",
    );
  }
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    return setPan(ref.current, {
      onPanStart,
      onPan,
      onPanEnd,
      onRelease,
      onPress,
      threshold,
      onDoubleTap,
    });
  }, [onDoubleTap, onPan, onPanEnd, onPanStart, onPress, onRelease, threshold]);

  return (
    <div
      ref={ref}
      id={id}
      data-command={props["data-command"]}
      data-key={props["data-key"]}
      style={style}
      className={className}
    >
      {children}
    </div>
  );
  // }
};
