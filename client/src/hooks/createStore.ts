import { useSyncExternalStore } from "react";

export const createStore = <T extends object>(initialState: T) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState = (patch: Partial<T> | ((prev: T) => Partial<T>)) => {
    const nextPatch = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...nextPatch };
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useStore = <R>(selector: (s: T) => R) =>
    useSyncExternalStore(subscribe, () => selector(state));

  return { getState, setState, subscribe, useStore };
};
