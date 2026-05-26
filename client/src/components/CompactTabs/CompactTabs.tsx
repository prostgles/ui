import { getEntries } from "@common/utils";
import { FullscreenWrapper } from "@components/FullscreenWrapper/FullscreenWrapper";
import React, { useMemo, useState } from "react";
import Btn from "../Btn";
import type { TestSelectors } from "src/Testing";

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
  maxHeight,
  titleEndContent,
  titleWhenMinimised,
  contentClassname,
  footer,
  ...testSelectors
}: {
  items: T;
  defaultTab?: keyof T;
  className?: string;
  style?: React.CSSProperties;
  contentClassname?: string;
  maxHeight?: number | string;
  controlled?: {
    activeTab: string;
    setActiveTab: (tab: keyof T) => void;
  };
  titleWhenMinimised: React.ReactNode;
  titleEndContent?: React.ReactNode;
  footer?: React.ReactNode;
} & TestSelectors) => {
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
      {...testSelectors}
      className={className}
      style={style}
      title={(minimized) => (
        <>
          {minimized ?
            titleWhenMinimised
          : Object.entries(items).map(([key, { disabledInfo }]) => (
              <Btn
                key={key}
                data-key={key}
                disabledInfo={disabledInfo}
                size="small"
                variant={activeTab === key ? "faded" : undefined}
                onClick={() => {
                  setActiveTab(key);
                }}
              >
                {key}
              </Btn>
            ))
          }
          {titleEndContent}
        </>
      )}
      maxContentHeight={maxHeight}
      footer={footer}
    >
      <>
        {getEntries(items).map(([tabName, { content }]) => (
          <div
            key={tabName as string}
            className={contentClassname}
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
    </FullscreenWrapper>
  );
};
