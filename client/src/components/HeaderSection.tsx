import {
  classOverride,
  FlexCol,
  FlexRow,
  type DivProps,
} from "@components/Flex";
import { Label } from "@components/Label";
import React from "react";

export const HeaderSection = ({
  title,
  titleEndContent,
  children,
  ...divProps
}: {
  title: string;
  titleEndContent?: React.ReactNode;
  children: React.ReactNode;
} & DivProps) => {
  return (
    <FlexCol
      {...divProps}
      className={classOverride("gap-p5", divProps.className)}
    >
      {title ?
        titleEndContent ?
          <FlexRow>
            <Label label={title} variant="normal" />
            {titleEndContent}
          </FlexRow>
        : <Label label={title} variant="normal" />
      : null}
      {children}
    </FlexCol>
  );
};
