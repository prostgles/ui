export const resolveColor = (color: string) => {
  if (!color.startsWith("var(") || !color.endsWith(")")) return color;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(color.slice(4, -1).trim())
    .trim();
};
