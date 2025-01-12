import React, { useEffect, useRef } from "react";

export function useWhyDidYouUpdate(props) {
  // Store previous props in a ref
  const prevProps = useRef<any>();
  const parentComponents = useParentComponents(6);
  const parentComponentNames = parentComponents.names.join(" > ");
  const parentsInfo = [parentComponentNames, parentComponents.parents];
  useEffect(() => {
    if (prevProps.current) {
      // Get all keys from current and previous props
      const allKeys = Object.keys({ ...prevProps.current, ...props });
      const changesObj = {};

      // Check which props have changed
      allKeys.forEach((key) => {
        if (prevProps.current[key] !== props[key]) {
          changesObj[key] = {
            from: prevProps.current[key],
            to: props[key],
          };
        }
      });

      // If there are changes, log them
      if (Object.keys(changesObj).length) {
        console.log("RENDERED", changesObj, parentsInfo);
      }
    }

    // Update prev props ref
    prevProps.current = props;
  });

  useEffect(() => {
    console.log("MOUNTED", props, parentsInfo);

    return () => {
      console.log("UNMOUNTED", props, parentsInfo);
    };
  }, []);
}

export const getReactInternals = (): ReactInternals =>
  React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"];

const useParentComponents = (maxDepth = 1) => {
  const internals = getReactInternals();
  // const stack = internals.ReactDebugCurrentFrame.getCurrentStack();
  // console.log(stack);
  return getParents(internals.ReactCurrentOwner.current, maxDepth);
};

const getParents = (current: RenderedComponentInfo, maxDepth = 1) => {
  const parents: RenderedComponentInfo[] = [];
  const names: string[] = [];
  let currentComponent: RenderedComponentInfo | null = current;
  while (currentComponent && maxDepth--) {
    names.push(currentComponent.elementType.name);
    parents.push(currentComponent);
    currentComponent = currentComponent._debugOwner;
  }
  return { names, parents };
};

type ReactInternals = {
  ReactDebugCurrentFrame: {
    getCurrentStack: () => string;
  };
  ReactCurrentOwner: {
    current: RenderedComponentInfo;
  };
};

type RenderedComponentInfo = {
  elementType: {
    name: string;
  };
  _debugOwner: RenderedComponentInfo | null;
};
