import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import React from "react";

type P = {
  title: string;
  iconPath: string;
  items: React.ReactNode[];
};
export const HeaderList = ({ title, iconPath, items }: P) => {
  return (
    <FlexCol className="gap-p5">
      <FlexRow className="gap-p5">
        {iconPath && <Icon path={iconPath} style={{ opacity: 0.8 }} />}
        <div className=" ">{title}</div>
      </FlexRow>
      <ul className="no-decor" style={{ paddingLeft: "2em" }}>
        {items.map((item, index) => (
          <li key={index} className="bold flex-row gap-p5 ai-center m-0 p-0">
            {item}
          </li>
        ))}
      </ul>
    </FlexCol>
  );
};
