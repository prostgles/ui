import { getEntries } from "@common/utils";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import React, { useMemo, useState } from "react";
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
  controlled,
}: {
  items: T;
  defaultTab?: keyof T;
  className?: string;
  style?: React.CSSProperties;
  controlled?: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
  };
}) => {
  const [localActiveTab, setLocalActiveTab] = useState(
    defaultTab ??
      getEntries(items).find(([_, item]) => !item.disabledInfo)?.[0],
  );
  const { activeTab, setActiveTab } = useMemo(() => {
    return (
      controlled ?? {
        activeTab: localActiveTab,
        setActiveTab: setLocalActiveTab,
      }
    );
  }, [controlled, localActiveTab]);
  return (
    <FullscreenWrapper
      className={className}
      style={style}
      title={Object.entries(items).map(([key, { disabledInfo }]) => (
        <Btn
          key={key}
          data-key={key}
          disabledInfo={disabledInfo}
          variant={activeTab === key ? "faded" : undefined}
          onClick={() => {
            setActiveTab(key);
          }}
        >
          {key}
        </Btn>
      ))}
      content={
        <>
          {getEntries(items).map(([tabName, { content }]) => (
            <div
              key={tabName as string}
              style={{
                /**
                 * Avoid layout shift when switching tabs
                 */
                display: tabName === activeTab ? "flex" : "none",
                flex: 1,
                minHeight: 0,
              }}
            >
              {content}
            </div>
          ))}
        </>
      }
    />
  );
};
