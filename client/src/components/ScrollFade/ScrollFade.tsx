import React, { useCallback, useEffect, useState } from "react";
import type { TestSelectors } from "../../Testing";
import { classOverride, type DivProps } from "../Flex";
import { useResizeObserver } from "./useResizeObserver";
import { fixIndent, getEntries } from "@common/utils";
import { isDefined, scrollIntoViewIfNeeded } from "../../utils";
import { isEqual } from "prostgles-types";
import { useLocation } from "react-router-dom";

type P = TestSelectors &
  DivProps & {
    children: React.ReactNode;
    className?: string;
    scrollRestore?: boolean;
  };

type Sides = Record<"top" | "bottom" | "left" | "right", boolean>;

/**
 * Given a list of children, this component will add a fade effect to the bottom of the children if the children are scrollable
 */
export const ScrollFade = ({ children, scrollRestore, ...divProps }: P) => {
  const [elem, setElem] = useState<HTMLDivElement | null>(null);
  const handleRef = useCallback((el: HTMLDivElement | null) => {
    setElem(el);
  }, []);
  useScrollFade(elem);
  useScrollRestore(scrollRestore ? elem : undefined);

  return (
    <div
      ref={handleRef}
      {...divProps}
      className={classOverride("ScrollFade", divProps.className ?? "")}
    >
      {children}
    </div>
  );
};

export const useScrollFade = (elem: HTMLElement | null) => {
  const [overflows, setOverflows] = React.useState({ x: false, y: false });
  const onScroll = useCallback(() => {
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
      fadeClasses.bottom = scrollTop + clientHeight < scrollHeight - threshold;
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
  }, [elem]);

  React.useEffect(() => {
    if (!elem) return;
    elem.addEventListener("scroll", onScroll);
    return () => elem.removeEventListener("scroll", onScroll);
  }, [elem, onScroll]);

  const onResize = useCallback(() => {
    onScroll();
    const thresholdPx = 2;
    if (!elem) return;
    const newOverflows = {
      x: elem.scrollWidth > elem.clientWidth + thresholdPx,
      y: elem.scrollHeight > elem.clientHeight + thresholdPx,
    };
    if (!isEqual(newOverflows, overflows)) {
      setOverflows(newOverflows);
    }
  }, [onScroll, elem, overflows]);

  useResizeObserver({
    elem,
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

/**
 * On fragment change will scroll to the appropriate element and restore scroll position on unmount
 */
const useScrollRestore = (list: HTMLElement | undefined | null) => {
  const { hash } = useLocation();
  const noHashScrollRef = React.useRef(0);

  useEffect(() => {
    if (!list || hash) return;
    const onScroll = () => {
      const currentHash = window.location.hash;
      if (currentHash) return;
      noHashScrollRef.current = list.scrollTop;
    };
    list.addEventListener("scroll", onScroll);
    return () => list.removeEventListener("scroll", onScroll);
  }, [list, hash]);

  useEffect(() => {
    if (!list) return;
    if (!hash) {
      list.scrollTop = noHashScrollRef.current;
    } else {
      try {
        const el = list.querySelector<HTMLHeadElement>(
          `[id='${hash.slice(1)}']`,
        );
        if (el) {
          scrollIntoViewIfNeeded(el);
        }
      } catch {}
    }
  }, [hash, list]);
};
