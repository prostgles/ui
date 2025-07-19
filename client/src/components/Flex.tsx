import React from "react";
import type { TestSelectors } from "../Testing";

export type DivProps = React.HTMLAttributes<HTMLDivElement> & TestSelectors;

const classPropsWithSides = ["p", "m"] as const;
const sides = ["t", "b", "l", "r", "x", "y"] as const;
const parseClass = (v: string) => (v.includes("-") ? v.split("-")[0] + "-" : v);

type FlexDivProps = DivProps & {
  disabledInfo?: string | false;
};
export const classOverride = (defaultClass = "", userClass = "") => {
  const userClasses = userClass.split(" ");
  const defaultParts = defaultClass
    .split(" ")
    .filter((defPart) => {
      const defClassProp = parseClass(defPart);
      return !userClasses.some((userClassPart) => {
        const userClassProp = parseClass(userClassPart);
        let userClassProps = [userClassProp];
        const sidedClassProp = classPropsWithSides.find(
          (c) => userClassProp === `${c}-`,
        );
        if (sidedClassProp) {
          userClassProps = sides.map((s) => `${sidedClassProp}${s}-`);
        }
        return userClassProps.some((uc) => uc.startsWith(defClassProp));
      });
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
