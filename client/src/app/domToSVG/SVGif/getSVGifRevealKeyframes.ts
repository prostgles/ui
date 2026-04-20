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
    // return [
    //   !fromPerc ? "" : (
    //     `0% { opacity: 0; transform: scale(${startScale}); transform-origin: center; }`
    //   ),
    //   `${toFixed(fromPerc, 4)}% { opacity: 0; transform: scale(${startScale}); transform-origin: center; }`,
    //   `${toFixed(fromPerc + 0.1, 4)}% { opacity: 0; transform: scale(${startScale}); transform-origin: center; }`,
    //   `${toFixed(toPerc, 4)}% { opacity: 1; transform: scale(1); transform-origin: center; }`,
    //   toPerc === 100 ? "" : (
    //     `100% { opacity: 1; transform: scale(1); transform-origin: center; }`
    //   ),
    // ].filter(Boolean);
    return getSVGifKeyframes(
      {
        percentage: fromPerc,
        attributes: {
          transform: `scale(${startScale})`,
          "transform-origin": "center",
        },
      },
      {
        percentage: toPerc,
        attributes: { transform: "scale(1)", "transform-origin": "center" },
      },
    );
  }
  if (mode === "opacity") {
    // return [
    //   !fromPerc ? "" : `0% { opacity: 0; }`,
    //   `${toFixed(fromPerc, 4)}% { opacity: 0; }`,
    //   `${toFixed(fromPerc + 0.1, 4)}% { opacity: 0; }`,
    //   `${toFixed(toPerc, 4)}% { opacity: 1; }`,
    //   toPerc === 100 ? "" : `100% { opacity: 1; }`,
    // ].filter(Boolean);
    return getSVGifKeyframes(
      {
        percentage: fromPerc,
        attributes: {},
      },
      {
        percentage: toPerc,
        attributes: {},
      },
    );
  }
  const clippedInset =
    mode === "top to bottom" ? `inset(0 0 100% 0)` : `inset(0 100% 0 0)`;

  // return [
  //   !fromPerc ? "" : `0% { opacity: 0; clip-path: ${clippedInset} }`,
  //   `${toFixed(fromPerc, 4)}% { opacity: 0; clip-path: ${clippedInset} }`,
  //   `${toFixed(fromPerc + 0.1, 4)}% { opacity: 1; clip-path: ${clippedInset} }`,
  //   `${toFixed(toPerc, 4)}% { opacity: 1;  clip-path: inset(0 0 0 0);  }`,
  //   toPerc === 100 ? "" : `100% { opacity: 1; clip-path: inset(0 0 0 0); }`,
  // ].filter(Boolean);
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
