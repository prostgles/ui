import ErrorComponent, { ErrorTrap } from "@components/ErrorComponent";
import { classOverride, FlexRow } from "@components/Flex";
import React from "react";
import type { TestSelectors } from "src/Testing";

type FooterProps = TestSelectors & {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  error?: any;
};
export const Footer = ({
  children,
  className,
  style,
  error,
  ...testSelectors
}: FooterProps) => {
  return (
    <ErrorTrap>
      <footer
        {...testSelectors}
        style={style}
        className={classOverride(
          "Footer bt b-color flex-row-wrap px-1 pt-1 jc-end " +
            (window.isMobileDevice ? " gap-p5 " : " gap-1 "),
          className,
        )}
      >
        <ErrorComponent
          className="f-1"
          withIcon={true}
          variant="outlined"
          error={error}
          style={{ maxHeight: "150px", minHeight: 0, overflow: "auto" }}
        />
        <FlexRow className="f-1">{children}</FlexRow>
      </footer>
    </ErrorTrap>
  );
};
