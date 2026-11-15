export const COLUMN_COLOR_NAMES = [
  "red",
  "pink",
  "purple",
  "blue",
  "indigo",
  "green",
  "yellow",
  "gray",
] as const;

export const COLUMN_COLOR_PALETTE = COLUMN_COLOR_NAMES.flatMap((name) => [
  `var(--${name})`,
  `var(--light-${name})`,
]);

export const COLUMN_COLOR_DESCRIPTION = [
  "Prefer theme-aware CSS variables over raw hex/rgb colors. Use only the variable names listed here; do not invent color names or shades.",
  `Palette: ${COLUMN_COLOR_PALETTE.join(", ")}.`,
  "Pair a foreground such as var(--green) for text/borders/bars with var(--light-green) for chip/cell backgrounds. The light- prefix means a subtle background in either theme.",
  "Defaults: var(--text-0) for normal text, var(--text-1) for muted text, var(--bg-color-0) for the surface background, var(--b-color) for neutral borders, and var(--active) for the default bar color.",
].join("\n");

export const chipColorsFadedBorder = COLUMN_COLOR_NAMES.map((name) => ({
  color: `var(--light-${name})`,
  borderColor: `var(--${name})`,
  textColor: `var(--${name})`,
}));

export const CHIP_COLOR_NAMES = Object.fromEntries(
  COLUMN_COLOR_NAMES.map((name, index) => [name, chipColorsFadedBorder[index]]),
) as Record<
  (typeof COLUMN_COLOR_NAMES)[number],
  (typeof chipColorsFadedBorder)[number]
>;

export const DEFAULT_CHIP_STYLE = CHIP_COLOR_NAMES.red;

export const chipColors = chipColorsFadedBorder.map(({ textColor }) => ({
  color: textColor,
  borderColor: undefined,
  textColor: "var(--bg-color-0)",
}));

export const chipColorsFaded = chipColorsFadedBorder.map((style) => ({
  ...style,
  borderColor: undefined,
}));
