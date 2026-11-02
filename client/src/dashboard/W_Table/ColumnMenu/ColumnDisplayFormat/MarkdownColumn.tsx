import Btn from "@components/Btn";
import { MarkdownWithPlugins } from "@components/MarkdownWithPlugins/MarkdownWithPlugins";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { useResizeObserver } from "@components/ScrollFade/useResizeObserver";
import { mdiChevronDown, mdiChevronUp } from "@mdi/js";
import React, { useId, useState } from "react";
import "./MarkdownColumn.css";

export const MarkdownColumn = ({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(
    null,
  );
  const contentId = useId();
  useResizeObserver({
    elem: contentElement,
    onResize: ({ height }) => {
      if (!contentElement || height === undefined) return;
      const lineHeight = parseFloat(
        getComputedStyle(contentElement).lineHeight,
      );
      setCanExpand(height > lineHeight * 3 + 1);
    },
  });

  return (
    <div
      className="MarkdownColumn flex-col min-w-0 f-0"
      data-expanded={expanded}
      style={{ lineHeight: 1.5 }}
    >
      <ScrollFade
        id={contentId}
        style={{ maxHeight: expanded ? undefined : "3lh", overflow: "hidden" }}
      >
        <div ref={setContentElement} style={{ display: "flow-root" }}>
          <MarkdownWithPlugins
            content={content}
            style={{ display: "block", overflow: "visible" }}
          />
        </div>
      </ScrollFade>
      {(canExpand || expanded) && (
        <Btn
          type="button"
          className="as-start"
          size="nano"
          variant="text"
          color="action"
          iconPath={expanded ? mdiChevronUp : mdiChevronDown}
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "Collapse" : "Expand"}
        </Btn>
      )}
    </div>
  );
};
