import React, { useEffect, useRef, useState } from "react";
import type { DivProps } from "../../components/Flex";

type P = Pick<DivProps, "children"> & {
  runningQuerySince: number | undefined;
};
export const W_Table_Content = ({ children, runningQuerySince }: P) => {
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (runningQuerySince && Date.now() - runningQuerySince > 500) {
        setLoading(true);
      } else {
        setLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(timeout);
      if (runningQuerySince) {
        setLoading(false);
      }
    };
  }, [runningQuerySince]);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    parent.style.cursor = loading ? "wait" : "auto";
  }, [loading]);

  return (
    <div
      key={"W_Table_Content"}
      ref={ref}
      className={"W_Table_Content flex-col oy-auto f-1 relative "}
      style={{
        /* ensure the header bottom shadow is visible */
        marginTop: "2px",
        ...(loading ? loadingStyle : {}),
      }}
    >
      {children}
    </div>
  );
};

const loadingStyle: React.CSSProperties = {
  cursor: "wait",
  pointerEvents: "none",
  touchAction: "none",
  opacity: 0.75,
};
