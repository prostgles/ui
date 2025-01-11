import { useEffect, useRef } from "react";

export function useWhyDidYouUpdate(componentName, props) {
  // Store previous props in a ref
  const prevProps = useRef<any>();

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
        console.log("[why-did-you-update]", componentName, changesObj);
      }
    }

    // Update prev props ref
    prevProps.current = props;
  });

  useEffect(() => {
    console.log("[why-did-you-update] mounted", componentName);
  }, [componentName]);
}
