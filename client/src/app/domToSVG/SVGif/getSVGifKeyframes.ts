import { toFixed } from "../utils/toFixed";

type Frame = {
  percentage: number;
  attributes: Partial<
    Record<
      | "x"
      | "y"
      | "width"
      | "height"
      | "transform"
      | "transform-origin"
      | "opacity"
      | "clip-path",
      string | number
    >
  >;
};

export const getSVGifKeyframes = (
  from: Frame,
  to: Frame,
  addOpacity = true,
) => {
  const fromPerc = from.percentage;
  const toPerc = to.percentage;
  const fromAttrs = Object.entries(from.attributes)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
  const toAttrs = Object.entries(to.attributes)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
  return [
    !fromPerc ? "" : `0% { ${addOpacity ? "opacity: 0;" : ""} ${fromAttrs} }`,
    `${toFixed(fromPerc, 4)}%         { ${addOpacity ? "opacity: 0;" : ""} ${fromAttrs} }`,
    `${toFixed(fromPerc + 0.1, 4)}%   { ${addOpacity ? "opacity: 1;" : ""} ${fromAttrs} }`,
    `${toFixed(toPerc, 4)}%           { ${addOpacity ? "opacity: 1;" : ""} ${toAttrs}  }`,
    toPerc === 100 ? "" : (
      `100%       { ${addOpacity ? "opacity: 1;" : ""} ${toAttrs} }`
    ),
  ].filter(Boolean);
};
