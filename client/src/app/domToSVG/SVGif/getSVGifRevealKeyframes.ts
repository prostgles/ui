import { toFixed } from "../utils/toFixed";

export const getSVGifRevealKeyframes = ({
  fromPerc,
  toPerc,
  mode,
}: {
  fromPerc: number;
  toPerc: number;
  mode: "top to bottom" | "left to right" | "opacity" | "growIn";
}) => {
  if (mode === "growIn") {
    return [
      !fromPerc ? "" : (
        `0% { opacity: 0; transform: scale(0.2); transform-origin: center; }`
      ),
      `${toFixed(fromPerc, 4)}% { opacity: 0; transform: scale(0.2); transform-origin: center; }`,
      `${toFixed(fromPerc + 0.1, 4)}% { opacity: 0; transform: scale(0.2); transform-origin: center; }`,
      `${toFixed(toPerc, 4)}% { opacity: 1; transform: scale(1); transform-origin: center; }`,
      toPerc === 100 ? "" : (
        `100% { opacity: 1; transform: scale(1); transform-origin: center; }`
      ),
    ].filter(Boolean);
  }
  if (mode === "opacity") {
    return [
      !fromPerc ? "" : `0% { opacity: 0; }`,
      `${toFixed(fromPerc, 4)}% { opacity: 0; }`,
      `${toFixed(fromPerc + 0.1, 4)}% { opacity: 0; }`,
      `${toFixed(toPerc, 4)}% { opacity: 1; }`,
      toPerc === 100 ? "" : `100% { opacity: 1; }`,
    ].filter(Boolean);
  }
  const clippedInset =
    mode === "top to bottom" ? `inset(0 0 100% 0)` : `inset(0 100% 0 0)`;
  return [
    !fromPerc ? "" : `0% { opacity: 0; clip-path: ${clippedInset} }`,
    `${toFixed(fromPerc, 4)}% { opacity: 0; clip-path: ${clippedInset} }`,
    `${toFixed(fromPerc + 0.1, 4)}% { opacity: 1; clip-path: ${clippedInset} }`,
    `${toFixed(toPerc, 4)}% { opacity: 1;  clip-path: inset(0 0 0 0);  }`,
    toPerc === 100 ? "" : `100% { opacity: 1; clip-path: inset(0 0 0 0); }`,
  ].filter(Boolean);
};
