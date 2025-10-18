import { SVG_NAMESPACE } from "../domToSVG";

export const addSVGifCaption = ({
  svgDom,
  appendStyle,
  height,
  caption,
  fromPerc,
  toPerc,
  sceneId,
  totalDuration,
}: {
  svgDom: SVGElement;
  appendStyle: (style: string) => void;
  width: number;
  height: number;
  caption: string;
  fromPerc: number;
  toPerc: number;
  sceneId: string;
  totalDuration: number;
}) => {
  appendStyle(`
    .caption-background {
      fill: light-dark(#ffffff, #1a1a1a);
      stroke: light-dark(#e0e0e0, #404040);
      stroke-width: 2;
    }
    .caption-text {
      fill: light-dark(#333333, #e0e0e0);
      font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif;
      font-size: 28px;
      user-select: none;
    }
    .caption-progress-bar {
      fill: light-dark(#00000066, #ffffff66);
    }
    @media (prefers-color-scheme: dark) {
      .caption-progress-bar { fill: #ffffff66; }
    }
  `);

  // Create caption group
  const captionGroup = document.createElementNS(SVG_NAMESPACE, "g");
  svgDom.appendChild(captionGroup);
  captionGroup.setAttribute("class", "caption");

  // Create text element
  const text = document.createElementNS(SVG_NAMESPACE, "text");
  text.setAttribute("text-anchor", "start");
  text.setAttribute("class", "caption-text");
  text.textContent = caption;

  captionGroup.appendChild(text);

  const bbox = text.getBBox();
  const textWidth = bbox.width;
  const textHeight = bbox.height;
  if (!textWidth || !textHeight) {
    throw new Error("Failed to measure caption text dimensions");
  }

  // Background dimensions with padding
  const padding = { x: 22, y: 22 };
  const bgWidth = textWidth + padding.x * 2;
  const bgHeight = textHeight + padding.y * 2;
  const bgX = 40;
  const bgY = height - bgHeight - 10;
  const borderRadius = 4;

  text.setAttribute("x", bgX + padding.x);
  text.setAttribute("y", bgY + bgHeight / 2 + textHeight / 3);

  const progressBar = document.createElementNS(SVG_NAMESPACE, "rect");
  const progressBarHeight = 4;
  const barId = "caption-progress-bar-" + sceneId;
  progressBar.setAttribute("id", barId);
  progressBar.setAttribute("class", "caption-progress-bar");
  progressBar.setAttribute("x", bgX);
  progressBar.setAttribute("y", bgY + bgHeight - progressBarHeight);
  progressBar.setAttribute("width", bgWidth);
  progressBar.setAttribute("height", progressBarHeight);
  progressBar.setAttribute("rx", "2");
  progressBar.setAttribute("ry", "2");
  captionGroup.prepend(progressBar);

  const bgRect = document.createElementNS(SVG_NAMESPACE, "rect");
  bgRect.setAttribute("x", bgX);
  bgRect.setAttribute("y", bgY);
  bgRect.setAttribute("width", bgWidth);
  bgRect.setAttribute("height", bgHeight);
  bgRect.setAttribute("rx", borderRadius);
  bgRect.setAttribute("ry", borderRadius);
  bgRect.setAttribute("class", "caption-background");
  captionGroup.prepend(bgRect);

  appendStyle(`
    @keyframes ${barId}-anim {
      0% { width: 0; }
      ${fromPerc + 0.1}% { width: 0; }
      ${toPerc - 0.1}% { width: ${bgWidth}px; }
      ${toPerc}% { width: 0; }
      100% { width: 0; }
    }
    #${barId} {
      animation: ${barId}-anim ${totalDuration}ms ease-in-out infinite; 
    }
  `);
};
