import React, { useCallback } from "react";
import type { TestSelectors } from "../../Testing";
import { classOverride } from "../Flex";
import "./ScrollFade.css";
import { useResizeObserver } from "./useResizeObserver";

type P = TestSelectors & {
  children: React.ReactNode;
  className?: string;
};
/**
 * Given a list of children, this component will add a fade effect to the bottom of the children if the children are scrollable
 */
export const ScrollFade = ({ children, ...testSelectors }: P) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const onScroll = useCallback(() => {
    if (!ref.current) return;
    const el = ref.current;
    const { scrollHeight, clientHeight } = el;
    if (
      clientHeight >= scrollHeight ||
      el.scrollTop + clientHeight >= scrollHeight
    ) {
      ref.current.classList.toggle("fade", false);
    } else {
      ref.current.classList.toggle("fade", true);
    }
  }, [ref]);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useResizeObserver({
    ref,
    box: "border-box",
    onResize: () => {
      onScroll();
    },
  });

  return (
    <div
      ref={ref}
      {...testSelectors}
      className={classOverride("ScrollFade", testSelectors.className ?? "")}
    >
      {children}
    </div>
  );
};
