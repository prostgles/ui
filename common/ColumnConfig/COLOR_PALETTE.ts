import { getRandomElement } from "../utils";
import { asRGB } from "./colorUtils";

export const MINI_BARCHART_COLOR = "var(--active)";

const COLORS = {
  "dark blue": "#174CFA",
  blue: "#0AA1FA",
  cyan: "#00D5FF",
  green: "#089981",
  orange: "#F79800",
  red: "#f23645",
  purple: "#CB11F0",
  indigo: "#7430F0",
  gray: "#cecece",
} as const;

const TIMECHART_COLORS = {
  // Blue: "#1f77b4",
  // Orange: "#ff7f0e",
  // Green: "#2ca02c",
  // Red: "#d62728",
  // Purple: "#9467bd",
  // Brown: "#8c564b",
  // Pink: "#e377c2",
  // Gray: "#7f7f7f",
  // Olive: "#bcbd22",
  // Teal: "#17becf",
  "Vivid Blue": "#2E7DFF",
  "Bright Orange": "#FF6B2C",
  "Lime Green": "#22C55E",
  "Cherry Red": "#EF4444",
  // "Electric Purple": "#A855F7",
  Purple: "#CB11F0",
  "Sunshine Yellow": "#F59E0B",
  "Cyan Teal": "#06B6D4",
  "Hot Pink": "#EC4899",
  "Lemon Lime": "#84CC16",
  "Aqua Green": "#14B8A6",
};

export const COLOR_PALETTE = Object.values(TIMECHART_COLORS);

export const COLOR_PALETTE_RGB = COLOR_PALETTE.map(
  (c) => asRGB(c).slice(0, 3) as [number, number, number],
);

export const getPaletteRGBColor = (layerIndex: number) => {
  return (
    COLOR_PALETTE_RGB[layerIndex] ?? getRandomElement(COLOR_PALETTE_RGB).elem
  );
};
