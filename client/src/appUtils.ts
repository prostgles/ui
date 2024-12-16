import { useEffect, useState } from "react";
import type { Theme } from "./App";

type Unsubscribe = {
  unsubscribe: () => void;
};

type OnStateChange<S> = (newState: S) => void;
type Subscribe<S> = (sc: OnStateChange<S>) => Unsubscribe;

export type ReactiveState<S> = {
  initialState: S;
  set: (newState: S) => void;
  get: () => S;
  subscribe: Subscribe<S>;
};
export const createReactiveState = <S>(
  initialState: S,
  onChange?: (state: S) => void,
) => {
  const handler: {
    listeners: OnStateChange<S>[];
    currentState: S;
  } = {
    listeners: [],
    currentState: initialState as S,
  };

  const rootReference: ReactiveState<S> = {
    subscribe: (listener) => {
      handler.listeners.push(listener);

      return {
        unsubscribe: () => {
          handler.listeners = handler.listeners.filter((l) => l !== listener);
        },
      };
    },
    set: (newState: S) => {
      handler.currentState = newState;
      handler.listeners.forEach((l) => l(handler.currentState));
      onChange?.(newState);
    },
    initialState: initialState as S,
    get: () => handler.currentState,
  };

  return rootReference;
};

export const useReactiveState = <S>(store: ReactiveState<S>) => {
  const [state, setState] = useState(store.get());
  useEffect(() => {
    return store.subscribe((newState) => {
      setState(newState);
    }).unsubscribe;
  }, [store]);

  return {
    state,
    setState: (data) => {
      store.set(data);
    },
  };
};

export const iOS = () => {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
};

declare global {
  interface Window {
    __prglIsImporting: any;
    /**
     * /Mobi/i.test(window.navigator.userAgent);
     */
    isMobileDevice: boolean;
    /**
     * window.matchMedia("(any-hover: none)").matches
     */
    isTouchOnlyDevice: boolean;
    /**
     * window.innerWidth < 700
     */
    isLowWidthScreen: boolean;
    /**
     * window.innerWidth < 1200
     */
    isMediumWidthScreen: boolean;
    isIOSDevice: boolean;
    isMobile: boolean;
  }
}

export const appTheme = createReactiveState<Theme>("light");

const checkSize = () => {
  window.isLowWidthScreen = window.innerWidth < 700;
  window.isMediumWidthScreen = window.innerWidth < 1200;
};
window.isIOSDevice = iOS();
window.isMobileDevice = /Mobi/i.test(window.navigator.userAgent);
window.isTouchOnlyDevice = window.matchMedia("(any-hover: none)").matches;
window.isMobile = window.isLowWidthScreen || window.isIOSDevice;
checkSize();
window.addEventListener("resize", checkSize);
