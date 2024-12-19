import React from "react";
import type { TestSelectors } from "../Testing";

export type DivProps = React.HTMLAttributes<HTMLDivElement> & TestSelectors;

type FlexDivProps = DivProps & {
  disabledInfo?: string | false;
};
export const classOverride = (defaultClass = "", userClass = "") => {
  const parseClass = (v: string) =>
    v.includes("-") ? v.split("-")[0] + "-" : v;
  const userClasses = userClass.split(" ");
  const defaultParts = defaultClass
    .split(" ")
    .filter((defPart) => {
      return !userClasses.some((userClassPart) =>
        parseClass(userClassPart).startsWith(parseClass(defPart)),
      );
    })
    .join(" ");
  return userClass + " " + defaultParts;
};

const FlexDiv = React.forwardRef<
  HTMLDivElement,
  FlexDivProps & { flexClass: string }
>(({ disabledInfo, flexClass, className, ...p }, ref) => {
  return (
    <div
      {...p}
      ref={ref}
      title={(disabledInfo || undefined) ?? p.title}
      className={classOverride(
        `${flexClass} ${disabledInfo ? "no-interaction" : ""}`,
        className,
      )}
    ></div>
  );
});

export const FlexRow = React.forwardRef<HTMLDivElement, FlexDivProps>(
  (p, ref) => {
    return (
      <FlexDiv {...p} ref={ref} flexClass="FlexRow flex-row gap-1 ai-center" />
    );
  },
);

export const FlexRowWrap = React.forwardRef<HTMLDivElement, FlexDivProps>(
  (p, ref) => {
    return (
      <FlexDiv
        {...p}
        ref={ref}
        flexClass="FlexRowWrap flex-row-wrap gap-1 ai-center"
      />
    );
  },
);

export const FlexCol = React.forwardRef<HTMLDivElement, FlexDivProps>(
  (p, ref) => {
    return <FlexDiv {...p} ref={ref} flexClass="FlexCol flex-col gap-1" />;
  },
);
