import { useIsMounted } from "prostgles-client/dist/react-hooks";
import { useEffect, useRef, useState } from "react";

type Size = {
  width: number | undefined;
  height: number | undefined;
};

type UseResizeObserverOptions<T extends HTMLElement = HTMLElement> = {
  elem: T | null;
  onResize?: (size: Size) => void;
  box?: "border-box" | "content-box" | "device-pixel-content-box";
};

const initialSize: Size = {
  width: undefined,
  height: undefined,
};

export function useResizeObserver<T extends HTMLElement = HTMLElement>(
  options: UseResizeObserverOptions<T>,
): Size {
  const { elem, box = "content-box" } = options;
  const [{ width, height }, setSize] = useState<Size>(initialSize);
  const getIsMounted = useIsMounted();
  const previousSize = useRef<Size>({ ...initialSize });
  const onResize = useRef<((size: Size) => void) | undefined>(undefined);
  onResize.current = options.onResize;

  useEffect(() => {
    if (!elem) return;

    if (typeof window === "undefined" || !("ResizeObserver" in window)) return;

    const observer = new ResizeObserver((d) => {
      const [entry] = d;
      const boxProp =
        box === "border-box" ? "borderBoxSize"
        : box === "device-pixel-content-box" ? "devicePixelContentBoxSize"
        : "contentBoxSize";

      const newWidth = extractSize(entry, boxProp, "inlineSize");
      const newHeight = extractSize(entry, boxProp, "blockSize");

      const hasChanged =
        previousSize.current.width !== newWidth ||
        previousSize.current.height !== newHeight;

      if (hasChanged) {
        const newSize: Size = { width: newWidth, height: newHeight };
        previousSize.current.width = newWidth;
        previousSize.current.height = newHeight;

        if (onResize.current) {
          onResize.current(newSize);
        } else {
          if (getIsMounted()) {
            setSize(newSize);
          }
        }
      }
    });

    observer.observe(elem, { box });

    return () => {
      observer.disconnect();
    };
  }, [box, elem, getIsMounted]);

  return { width, height };
}

type BoxSizesKey = keyof Pick<
  ResizeObserverEntry,
  "borderBoxSize" | "contentBoxSize" | "devicePixelContentBoxSize"
>;

function extractSize(
  entry: ResizeObserverEntry,
  box: BoxSizesKey,
  sizeType: keyof ResizeObserverSize,
): number | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!entry[box]) {
    if (box === "contentBoxSize") {
      return entry.contentRect[sizeType === "inlineSize" ? "width" : "height"];
    }
    return undefined;
  }

  return Array.isArray(entry[box]) ?
      entry[box][0]![sizeType]
      // @ts-ignore Support Firefox's non-standard behavior
    : (entry[box][sizeType] as number);
}
