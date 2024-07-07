import React from "react"
import type { TestSelectors } from "../Testing";

export type DivProps = React.HTMLAttributes<HTMLDivElement> & TestSelectors;

export const classOverride = (defaultClass = "", userClass = "") => {
  const parseClass = (v: string) => v.includes("-")? (v.split("-")[0] + "-") : v;
  const userClasses = userClass.split(" ");
  const defaultParts = defaultClass.split(" ")
    .filter(defPart => {
      return !userClasses.some(userClassPart => parseClass(userClassPart).startsWith(parseClass(defPart)))
    }).join(" ")
  return userClass + " " + defaultParts;
};
export const FlexRow = React.forwardRef<HTMLDivElement, DivProps>((p, ref) => {
  return <div { ...p } ref={ref} className={classOverride(`FlexRow flex-row gap-1 ai-center`, p.className)}></div>
})

export const FlexRowWrap = React.forwardRef<HTMLDivElement, DivProps>((p, ref) => {
  return <div { ...p } ref={ref} className={classOverride(`FlexRowWrap flex-row-wrap gap-1 ai-center`, p.className)}></div>
});

export const FlexCol = React.forwardRef<HTMLDivElement, DivProps>((p, ref) => {
  return <div { ...p } ref={ref} className={classOverride(`FlexCol flex-col gap-1 `, p.className)}></div>
});