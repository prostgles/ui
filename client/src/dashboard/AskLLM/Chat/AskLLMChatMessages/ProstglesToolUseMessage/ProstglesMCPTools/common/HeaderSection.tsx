import { classOverride, FlexCol, type DivProps } from "@components/Flex";
import { Label } from "@components/Label";
import React from "react";

export const HeaderSection = ({
  title,
  children,
  ...divProps
}: {
  title: string;
  children: React.ReactNode;
} & DivProps) => {
  return (
    <FlexCol
      {...divProps}
      className={classOverride("gap-p5", divProps.className)}
    >
      <Label label={title} variant="normal" />
      {children}
    </FlexCol>
  );
};
