import { useMemoDeep } from "prostgles-client/dist/react-hooks";
import { useCallback, useEffect, useMemo } from "react";

type RowNodeWithInfo = HTMLDivElement & {
  nodeRect?: DOMRect | undefined;
  initialStyle: Pick<CSSStyleDeclaration, "display"> | undefined;
};

type P = {
  scrollBodyRef: React.RefObject<HTMLDivElement>;
  rows: any[];
  mode: "auto" | "off";
};

/**
 * Given a table body with rows, render only visible
 * VERY experimental. react-virtuoso not used because scrolling is not smooth
 * */
export const useVirtualisedRows = ({
  scrollBodyRef,
  rows: nonMemoRows,
  mode,
}: P) => {
  const rows = useMemoDeep(() => nonMemoRows, [nonMemoRows]);
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
    const setRectAndSize = (node: RowNodeWithInfo, isRow: boolean) => {
      const nodeRect = node.getBoundingClientRect();
      node.nodeRect = nodeRect;
      const display = node.style.display;
      node.initialStyle = { display };
      node.style.width = `${nodeRect.width}px`;
      node.style.height = `${nodeRect.height}px`;
      node.style.top = !isRow ? "0px" : `${nodeRect.top - offsetTop}px`;
      node.style.left = `${nodeRect.left - offsetLeft}px`;
      node.style.position = "absolute";
    };
    const checkChildNodes = (
      parentNode: HTMLDivElement,
      isRow = true,
    ): boolean => {
      let isFirstRun = false;
      Array.from(parentNode.children as unknown as RowNodeWithInfo[])
        .slice(0)
        .reverse() // This is to ensure changing to absolute position does not affect the previous rows
        .forEach((node, i) => {
          if (
            (isRow && node.role !== "row") ||
            (!isRow && node.role !== "cell")
          )
            return;
          if (!("nodeRect" in node) || !node.initialStyle) {
            setRectAndSize(node, isRow);
            if (isRow) {
              /** Prevent items resizing due to flex */
              Array.from(node.children as unknown as RowNodeWithInfo[]).forEach(
                (child) => {
                  const childRect = child.getBoundingClientRect();
                  child.style.maxWidth = `${childRect.width}px`;
                  child.style.width = `${childRect.width}px`;
                },
              );
              checkChildNodes(node, false);
            }
            isFirstRun = true;
          }
          const nodeRect = node.nodeRect || node.getBoundingClientRect();

          const isTooUp =
            nodeRect.bottom - offsetTop < scrollBody.scrollTop - threshold;
          const isTooDown =
            nodeRect.top - offsetTop >
            scrollBody.scrollTop + scrollBody.clientHeight + threshold;
          const isOutOfView = isTooUp || isTooDown;

          const rowDisplay = isOutOfView ? "none" : node.initialStyle!.display;
          if (rowDisplay !== node.style.display) {
            node.style.display = rowDisplay;
            if (isOutOfView && isRow) {
              return;
            }
          }

          if (!isRow) return;
          Array.from(node.children as unknown as RowNodeWithInfo[]).forEach(
            (child) => {
              const childRect = child.nodeRect!;
              const isTooLeftOfView =
                childRect.right - offsetLeft <
                xScrollParent.scrollLeft - threshold;
              const isTooRightOfView =
                childRect.left - offsetLeft >
                xScrollParent.scrollLeft +
                  xScrollParent.clientWidth +
                  threshold;
              const cellIsOutOfView = isTooLeftOfView || isTooRightOfView;

              const display =
                cellIsOutOfView ? "none" : node.initialStyle!.display;
              if (child.style.display !== display) {
                child.style.display = display;
              }
            },
          );
        });
      return isFirstRun;
    };
    const sizeWasSet = checkChildNodes(scrollContentWrapper);
    if (sizeWasSet) {
      checkChildNodes(scrollContentWrapper);
    }
  }, [getParentNodes]);

  const disabled = useMemo(() => {
    const disabled =
      mode === "off" ||
      (rows.length < 20 && Object.keys(rows[0] ?? {}).length < 30);
    return disabled;
  }, [rows, mode]);

  useEffect(() => {
    if (disabled) {
      return;
    }
    const pNodes = getParentNodes();
    if (!pNodes) {
      return;
    }
    const { xScrollParent, scrollContentWrapper, scrollBody } = pNodes;
    scrollContentWrapper.style.height = scrollBody.scrollHeight + "px";
    scrollContentWrapper.style.width = scrollBody.scrollWidth + "px";
    onScroll();
    xScrollParent.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => {
      xScrollParent.removeEventListener("scroll", onScroll);
    };
  }, [rows, disabled, onScroll, getParentNodes]);

  return {
    onScroll: disabled ? undefined : onScroll,
  };
};
