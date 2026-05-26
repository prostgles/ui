import { useCallback, useEffect, useRef } from "react";

export const useThrottledCallback = <
  T extends (...args: Parameters<T>) => void,
>(
  callback: T,
  deps: React.DependencyList,
  delay = 300,
): ((...args: Parameters<T>) => void) => {
  const callbackRef = useRef(callback);
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, deps]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callbackRef.current(...args);
        }, delay - timeSinceLastCall);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...deps],
  );
};
