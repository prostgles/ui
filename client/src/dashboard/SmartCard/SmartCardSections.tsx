import React from "react";
import type { CardFieldSection } from "./getSectionedCardColumns";
import "./SmartCardSections.css";

export const SmartCardSections = ({
  fields,
}: {
  fields: { section: CardFieldSection | undefined; node: React.ReactNode }[];
}) => {
  const summaryFields = fields.filter(({ section }) => !section);
  const sections = new Map<
    number,
    { section: CardFieldSection; nodes: React.ReactNode[] }
  >();
  fields.forEach(({ section, node }) => {
    if (!section) return;
    const group = sections.get(section.index) ?? { section, nodes: [] };
    group.nodes.push(node);
    sections.set(section.index, group);
  });
  return (
    <div className="SmartCardBody SmartCardSections w-full min-w-0 flex-col gap-1">
      {!!summaryFields.length && (
        <div className="SmartCardSummaryFields flex-row-wrap gap-1">
          {summaryFields.map(({ node }) => node)}
        </div>
      )}
      {Array.from(sections.values()).map(({ section, nodes }) => {
        const style: React.CSSProperties & {
          "--card-section-columns": number;
        } = {
          "--card-section-columns": section.columns,
        };
        return (
          <section
            key={section.index}
            className="SmartCardSection flex-col gap-p5 min-w-0"
          >
            {section.header && (
              <h3 className="m-0 font-16">{section.header}</h3>
            )}
            <div
              className={`SmartCardSectionFields gap-1 ${section.layout === "inline" ? "SmartCardSectionFields--inline" : ""}`}
              style={style}
            >
              {nodes}
            </div>
          </section>
        );
      })}
    </div>
  );
};
