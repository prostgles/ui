import { classOverride, FlexCol, FlexRow } from "@components/Flex";
import React, { type ReactFragment } from "react";

import Btn from "@components/Btn";
import Popup, { type PopupProps } from "@components/Popup/Popup";
import { mdiFullscreen } from "@mdi/js";

export const PopupSection = (
  props: Pick<PopupProps, "children"> & {
    titleItems: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  },
) => {
  const { titleItems, children, className, style } = props;
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement>();
  const titleNode = (
    <FlexRow className="pl-p5 f-1">
      {titleItems}
      {!anchorEl && (
        <Btn
          className="ml-auto"
          data-command="PopupSection.fullscreen"
          iconPath={mdiFullscreen}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        />
      )}
    </FlexRow>
  );
  return (
    <>
      <FlexCol className="gap-0">
        {titleNode}
        {children}
      </FlexCol>
      {anchorEl && (
        <Popup
          data-command="PopupSection.content"
          title={titleNode}
          clickCatchStyle={{ opacity: 1 }}
          anchorEl={anchorEl}
          positioning="fullscreen"
          onClose={() => setAnchorEl(undefined)}
          rootChildClassname={classOverride("f-1", className)}
          rootChildStyle={style}
          contentClassName="p-1 flex-col gap-1 f-1"
        >
          {children}
        </Popup>
      )}
    </>
  );
};
