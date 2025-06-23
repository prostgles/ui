import React, { useCallback } from "react";
import type { TestSelectors } from "../../Testing";
import { classOverride, type DivProps } from "../Flex";
import { useResizeObserver } from "./useResizeObserver";
import { fixIndent, getEntries } from "../../../../commonTypes/utils";
import { isDefined } from "../../utils";
import { isEqual } from "prostgles-types";

type P = TestSelectors &
  DivProps & {
    children: React.ReactNode;
    className?: string;
  };

type Sides = Record<"top" | "bottom" | "left" | "right", boolean>;

/**
 * Given a list of children, this component will add a fade effect to the bottom of the children if the children are scrollable
 */
export const ScrollFade = ({ children, ...divProps }: P) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useScrollFade({ ref });

  return (
    <div
      ref={ref}
      {...divProps}
      className={classOverride("ScrollFade", divProps.className ?? "")}
    >
      {children}
    </div>
  );
};

export const useScrollFade = ({
  ref,
}: {
  ref: React.RefObject<HTMLElement>;
}) => {
  const [overflows, setOverflows] = React.useState({ x: false, y: false });
  const el = ref.current;
  const onScroll = useCallback(() => {
    const elem = ref.current;
    if (!elem) return;
    const {
      scrollHeight,
      clientHeight,
      scrollTop,
      scrollWidth,
      clientWidth,
      scrollLeft,
    } = elem;
    const fadeClasses = {
      bottom: false,
      top: false,
      right: false,
      left: false,
    };
    const threshold = 10;
    if (scrollHeight >= clientHeight) {
      fadeClasses.top = scrollTop > threshold;
      fadeClasses.bottom = scrollTop + clientHeight < scrollHeight;
    }
    if (scrollWidth >= clientWidth) {
      fadeClasses.left = scrollLeft > threshold;
      fadeClasses.right = scrollLeft + clientWidth < scrollWidth;
    }
    const finalMask = getEntries(fadeClasses)
      .map(([k, v]) => {
        if (v) return getGradient(k);
      })
      .filter(isDefined)
      .join(",\n");
    elem.style.mask = finalMask;
    /** Required to ensure the masks colors stack correctly */
    elem.style["-webkit-mask-composite"] = "source-in";
  }, [ref]);

  React.useEffect(() => {
    if (!el) return;
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [el, onScroll]);

  const onResize = useCallback(() => {
    onScroll();
    const thresholdPx = 2;
    if (!el) return;
    const newOverflows = {
      x: el.scrollWidth > el.clientWidth + thresholdPx,
      y: el.scrollHeight > el.clientHeight + thresholdPx,
    };
    if (!isEqual(newOverflows, overflows)) {
      setOverflows(newOverflows);
    }
  }, [onScroll, el, overflows]);

  useResizeObserver({
    ref,
    box: "border-box",
    onResize,
  });

  return overflows;
};

const getGradient = (side: keyof Sides) => {
  return fixIndent(`
    linear-gradient(
      to ${
        side === "bottom" ? "top"
        : side === "left" ? "right"
        : side === "right" ? "left"
        : "bottom"
      },
      rgba(0, 0, 0, 0.1) 0px,
      rgba(0, 0, 0, 0.9) 40px,
      rgba(0, 0, 0, 1) 80px,
      rgba(0, 0, 0, 1) 100%
    )`);
};
