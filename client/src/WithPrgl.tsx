import React from "react";
import type { Prgl } from "./App";
import { prgl_R } from "./App";
import { useReactiveState } from "./appUtils"

export const WithPrgl = ({ onRender }: { onRender: (prgl: Prgl) => React.ReactNode }): JSX.Element => {
  const { state: prgl } = useReactiveState(prgl_R);

  if(!prgl) return <></>;
  const res = onRender(prgl);
  return <>{res}</>;
}