import { Section } from "@components/Section";
import React from "react";

export const DashboardMenuSection = ({
  title,
  itemCount,
  addButton,
  children,
}: {
  title: string;
  itemCount: number;
  addButton: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Section
    title={title}
    titleIconPath=""
    titleRightContent={(open) => (
      <>
        {!open && <span className="text-2 mr-p5 font-14">{itemCount}</span>}
        <div className="flex-row ai-center ml-auto">{addButton}</div>
      </>
    )}
    open
    disableFullScreen
    className="f-0 b-0"
    btnProps={{
      title,
      size: "small",
      variant: "text",
      className: "f-0 min-w-0 p-p5 ta-left bold jc-start",
    }}
    contentClassName="flex-col min-h-0"
    contentStyle={{ maxHeight: "30vh" }}
  >
    {children}
  </Section>
);
