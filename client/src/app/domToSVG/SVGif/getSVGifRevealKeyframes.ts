import { getSVGifKeyframes } from "./getSVGifKeyframes";

export const getSVGifRevealKeyframes = ({
  fromPerc,
  toPerc,
  mode,
}: {
  fromPerc: number;
  toPerc: number;
  mode:
    | "top to bottom"
    | "left to right"
    | "opacity"
    | { type: "growIn"; startScale: number | undefined };
}) => {
  const { type: modeStr, startScale = 0.2 } =
    typeof mode === "string" ? { type: mode } : mode;
  if (modeStr === "growIn") {
    return getSVGifKeyframes(
      {
        percentage: fromPerc,
        attributes: {
          transform: `scale(${startScale})`,
          "transform-origin": "center",
          opacity: 0,
        },
      },
      {
        percentage: toPerc,
        attributes: {
          transform: "scale(1)",
          "transform-origin": "center",
          opacity: 1,
        },
      },
      false,
    );
  }
  if (mode === "opacity") {
    return getSVGifKeyframes(
      {
        percentage: fromPerc,
        attributes: {
          opacity: 0,
        },
      },
      {
        percentage: toPerc,
        attributes: {
          opacity: 1,
        },
      },
      false,
    );
  }
  const clippedInset =
    mode === "top to bottom" ? `inset(0 0 100% 0)` : `inset(0 100% 0 0)`;

  return getSVGifKeyframes(
    {
      percentage: fromPerc,
      attributes: {
        "clip-path": clippedInset,
      },
    },
    {
      percentage: toPerc,
      attributes: {
        "clip-path": "inset(0 0 0 0)",
      },
    },
  );
};
