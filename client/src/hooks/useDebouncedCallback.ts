import { useCallback, useRef, useEffect } from "react";

export const useDebouncedCallback = <
  T extends (...args: Parameters<T>) => void,
>(
  callback: T,
  deps: React.DependencyList,
  delay = 300,
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...deps],
  );
};
