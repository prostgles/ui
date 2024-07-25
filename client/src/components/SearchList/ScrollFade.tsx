import React from "react";
import type { TestSelectors } from "../../Testing";
import { classOverride } from "../Flex";
import "./ScrollFade.css";

type P = TestSelectors & {
  children: React.ReactNode;
  className?: string;
}
/**
 * Given a list of children, this component will add a fade effect to the bottom of the children if the children are scrollable
 */
export const ScrollFade = ({ children, ...testSelectors }: P) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {

    const el = ref.current;
    if(!el) return;
    const onScroll = () => {
      const { scrollHeight, clientHeight } = el;
      if(clientHeight >= scrollHeight || el.scrollTop + clientHeight >= scrollHeight){
        ref.current!.classList.toggle("fade", false);
      } else {
        ref.current!.classList.toggle("fade", true);
      }
    }
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} {...testSelectors} className={classOverride("ScrollFade", testSelectors.className ?? "")}>
      {children}
    </div>
  );
}