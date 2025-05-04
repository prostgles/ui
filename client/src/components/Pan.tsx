import React, { useEffect } from "react";
import type { TestSelectors } from "../Testing";
import { setPan, type PanListeners } from "../dashboard/setPan";

type PanProps = TestSelectors &
  PanListeners & {
    style?: React.CSSProperties;
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
