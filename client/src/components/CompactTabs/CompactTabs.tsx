import { getEntries } from "@common/utils";
import { FlexCol } from "@components/Flex";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import type { TabItems, TabsProps } from "@components/Tabs";
import React, { useState } from "react";
import Btn from "../Btn";

type CompactTabItem = {
  label: string;
  content: React.ReactNode;
  disabledInfo?: string;
};
export const CompactTabs = <T extends Record<string, CompactTabItem>>({
  className,
  style,
  defaultTab,
  items,
}: {
  items: T;
  defaultTab?: keyof T;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [activeTab, setActiveTab] = useState(
    defaultTab ??
      getEntries(items).find(([_, item]) => !item.disabledInfo)?.[0],
  );
  const activeTabItem = activeTab ? items[activeTab] : undefined;

  return (
    <FullscreenWrapper
      className={className}
      style={style}
      title={Object.entries(items).map(([key, { disabledInfo }]) => (
        <Btn
          key={key}
          disabledInfo={disabledInfo}
          variant={activeTab === key ? "faded" : undefined}
          onClick={() => {
            setActiveTab(key);
          }}
        >
          {key}
        </Btn>
      ))}
      content={activeTabItem?.content ?? null}
    />
  );
};
