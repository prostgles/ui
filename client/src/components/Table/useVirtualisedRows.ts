import { useCallback, useEffect } from "react";

type RowNodeWithInfo = HTMLDivElement & {
  nodeRect?: DOMRect | undefined;
  initialStyle: CSSStyleDeclaration | undefined;
};

type P = {
  scrollBodyRef: React.RefObject<HTMLDivElement>;
  rows: any[];
};

/**
 * Given a table body with rows, render only visible
 * VERY experimental. react-virtuoso not used because scrolling is not smooth
 * */
export const useVirtualisedRows = ({ scrollBodyRef, rows }: P) => {
  const getParentNodes = useCallback(() => {
    const xScrollParent =
      scrollBodyRef.current?.closest<HTMLDivElement>(".table-component");
    const scrollContentWrapper = scrollBodyRef.current;
    const scrollBody = scrollContentWrapper?.parentElement;
    if (!scrollBody || !xScrollParent) {
      return;
    }
    return { xScrollParent, scrollContentWrapper, scrollBody };
  }, [scrollBodyRef]);

  const onScroll = useCallback(() => {
    const pNodes = getParentNodes();
    if (!pNodes) return;
    const { xScrollParent, scrollContentWrapper, scrollBody } = pNodes;
    const offsetTop = scrollBody.getBoundingClientRect().top;
    const offsetLeft = xScrollParent.getBoundingClientRect().left;
    const threshold = 100;
    const setRectAndSize = (node: RowNodeWithInfo) => {
      const nodeRect = node.getBoundingClientRect();
      node.nodeRect = nodeRect;
      node.initialStyle = { ...node.style };
      node.style.width = `${nodeRect.width}px`;
      node.style.height = `${nodeRect.height}px`;
      node.style.top = `${nodeRect.top - offsetTop}px`;
      node.style.left = `${nodeRect.left - offsetLeft}px`;
      node.style.position = "absolute";
    };
    const checkNodeRect = (node: RowNodeWithInfo) => {
      const nodeRect = node.nodeRect || node.getBoundingClientRect();
      if (!("nodeRect" in node) || !node.initialStyle) {
        setRectAndSize(node);
        // Array.from(node.children as unknown as RowNodeWithInfo[])
        //   .slice(0)
        //   .reverse()
        //   .forEach((child) => {
        //     setRectAndSize(child);
        //   });
        return;
      }

      const isTooUp =
        nodeRect.bottom - offsetTop < scrollBody.scrollTop - threshold;
      const isTooDown =
        nodeRect.top - offsetTop >
        scrollBody.scrollTop + scrollBody.clientHeight + threshold;
      const isOutOfView = isTooUp || isTooDown;

      const rowDisplay = isOutOfView ? "none" : node.initialStyle.display;
      if (rowDisplay !== node.style.display) {
        node.style.display = rowDisplay;
        if (isOutOfView) {
          // Array.from(node.children as unknown as RowNodeWithInfo[]).forEach(
          //   (child) => {
          //     child.style.display = child.initialStyle!.display;
          //   },
          // );
          return;
        }
      }

      // Array.from(node.children as unknown as RowNodeWithInfo[]).forEach(
      //   (child) => {
      //     const childRect = child.nodeRect!;
      //     const isTooLeftOfView =
      //       childRect.right - offsetLeft < xScrollParent.scrollLeft - threshold;
      //     const isTooRightOfView =
      //       childRect.left - offsetLeft >
      //       xScrollParent.scrollLeft + xScrollParent.clientWidth + threshold;
      //     const cellIsOutOfView = isTooLeftOfView || isTooRightOfView;

      //     const display = cellIsOutOfView ? "none" : node.initialStyle!.display;
      //     if (child.style.display !== display) {
      //       child.style.display = display;
      //       if (!cellIsOutOfView) {
      //         node.style.position = "absolute";
      //         node.style.top = "0px"; //`${nodeRect.top - offsetTop}px`;
      //         node.style.left = `${nodeRect.left - offsetLeft}px`;
      //       }
      //     }
      //   },
      // );
    };
    const rowNodes = Array.from(
      scrollContentWrapper.children as unknown as RowNodeWithInfo[],
    )
      .slice(0)
      .reverse(); // This is to ensure changing to absolute position does not affect the previous rows
    rowNodes.forEach((node, i) => {
      checkNodeRect(node);
    });
  }, [getParentNodes]);

  useEffect(() => {
    const disable = rows.length < 20 && Object.keys(rows[0] ?? {}).length < 30;

    if (disable) {
      return;
    }
    onScroll();
    const pNodes = getParentNodes();
    if (!pNodes) {
      return;
    }
    const { xScrollParent, scrollContentWrapper, scrollBody } = pNodes;
    scrollContentWrapper.style.height = scrollBody.scrollHeight + "px";
    xScrollParent.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => {
      xScrollParent.removeEventListener("scroll", onScroll);
    };
  }, [rows, onScroll, getParentNodes]);

  return {
    onScroll,
  };
};
