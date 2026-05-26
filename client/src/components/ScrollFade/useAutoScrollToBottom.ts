import { useEffect, useRef } from "react";

export const useAutoScrollToBottom = (
  elem: HTMLElement | null,
  children: unknown,
  scrollToBottomOnMount: boolean,
) => {
  const isAtBottom = useRef(true);

  useEffect(() => {
    if (
      scrollToBottomOnMount &&
      elem &&
      elem.scrollHeight > elem.clientHeight &&
      isAtBottom.current
    ) {
      elem.scrollTop = elem.scrollHeight;
    }
  }, [elem, scrollToBottomOnMount, children]);

  useEffect(() => {
    if (!elem) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = elem;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 20;
      isAtBottom.current = atBottom;
    };
    elem.addEventListener("scroll", onScroll);
    return () => elem.removeEventListener("scroll", onScroll);
  }, [elem]);
};
