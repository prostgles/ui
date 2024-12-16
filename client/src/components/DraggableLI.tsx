import type { PropsWithChildren } from "react";
import React from "react";
import type { TestSelectors } from "../Testing";

type P<T> = TestSelectors &
  PropsWithChildren<
    React.HTMLAttributes<HTMLLIElement> & {
      idx: number;
      items: T;
      onReorder?: (newList: T) => void;
    }
  >;
export const DraggableLI = <T extends any[]>({
  children,
  onReorder,
  items,
  idx,
  ...props
}: P<T>) => {
  const shouldStop = (e: React.DragEvent<HTMLLIElement>) => {
    if (window.getSelection()?.toString().length) {
      e.stopPropagation();
      e.preventDefault();
      return true;
    }
  };

  type ListParent =
    | null
    | (HTMLElement & {
        _initialSize?: {
          width: string;
          height: string;
        };
        _targetIdx?: number;
      });

  return (
    <li
      {...props}
      draggable={Boolean(onReorder)}
      onDrag={
        !onReorder ? undefined : (
          (e) => {
            if (shouldStop(e)) {
              return false;
            }

            const elem = e.currentTarget;
            const p = elem.parentElement as ListParent;
            // Lock parent size to prevent jitter

            if (!p) throw "Not possible";

            p._initialSize ??= {
              width: p.style.width,
              height: p.style.height,
            };
            p.style.width = `${p.offsetWidth}px`;
            p.style.height = `${p.offsetHeight}px`;

            const isRow = getComputedStyle(p).flexDirection === "row";
            const getSize = (e: HTMLLIElement) =>
              isRow ? e.offsetWidth : e.offsetHeight;
            let size = getSize(elem);
            elem.style.display = "none";
            // elem.style.opacity = "0.2";

            const siblings = Array.from(p.children) as HTMLLIElement[];
            const targetIndex = siblings.findIndex((s) => {
              const r = s.getBoundingClientRect();
              const horizontalOverlap =
                e.clientX > r.x && e.clientX < r.x + r.width;
              const verticalOverlap =
                e.clientY > r.y && e.clientY < r.y + r.height;
              return horizontalOverlap && verticalOverlap;
            });

            if (idx === targetIndex || targetIndex < 0) {
              return;
            }

            siblings.map((c, siblingIdx) => {
              // c.style.background = res? "red" : "";
              size = size || getSize(c);

              const isTarget = targetIndex === siblingIdx;
              const offsetPx = isTarget ? `${size}px` : "0";

              if (isRow) {
                // if(newPadding !== c.style.paddingLeft) c.style.paddingLeft = newPadding;
                if (offsetPx !== c.style.marginLeft)
                  c.style.marginLeft = offsetPx;
              } else {
                // if(newPadding !== c.style.paddingTop) c.style.paddingTop = newPadding;
                if (offsetPx !== c.style.marginTop)
                  c.style.marginTop = offsetPx;
              }

              if (isTarget) {
                p._targetIdx = siblingIdx;
              }
            });

            const pr = p.getBoundingClientRect();

            if (isRow) {
              if (e.clientX > pr.x + pr.width) {
                p.scrollLeft += 10;
              } else if (e.clientX < pr.x) {
                p.scrollLeft -= 10;
              }
            } else {
              if (e.clientY > pr.y + pr.height) {
                p.scrollTop += 10;
              } else if (e.clientY < pr.y) {
                p.scrollTop -= 10;
              }
            }

            // console.log(pr, e.clientY, e.nativeEvent.pageY);
          }
        )
      }
      onDragEnd={
        !onReorder ? undefined : (
          async (e) => {
            if (shouldStop(e)) {
              return false;
            }

            const elem = e.currentTarget;
            const p = elem.parentElement as ListParent;

            if (!p) throw "Not possible";

            const tIdx = p._targetIdx;
            if (typeof p._targetIdx !== "number") throw "Not possible";
            const res = items.slice(0) as typeof items;

            const moveItem = (from, to) => {
              const f = res.splice(from, 1)[0]!;
              res.splice(to, 0, f);
            };

            // [res[i], res[tIdx]] = [res[tIdx], res[i]];
            moveItem(idx, tIdx);
            await onReorder(res);

            setTimeout(() => {
              Array.from(p.children as unknown as HTMLElement[]).map(
                (c: HTMLElement) => {
                  c.style.paddingTop = "";
                  c.style.paddingLeft = "";
                  c.style.marginLeft = "";
                  c.style.marginTop = "";
                },
              );
              elem.style.display = "flex";
              // elem.style.opacity = "1";

              if (!p._initialSize) throw "Not possible";
              p.style.width = p._initialSize.width;
              p.style.height = p._initialSize.height;
              p._initialSize = undefined;
            }, 1);
          }
        )
      }
    >
      {children}
    </li>
  );
};
