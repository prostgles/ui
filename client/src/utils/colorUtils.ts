export const asHex = (v: string) => {
  if (v.startsWith("#")) return v;

  const [r, g, b] = asRGB(v);
  return rgbToHex(r, g, b);
};

export const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");

export const asRGB = (color: string, maxOpacity?: "1" | "255"): RGBA => {
  if (color.toLowerCase().trim().startsWith("rgb")) {
    const rgba = color
      .trim()
      .split("(")[1]
      ?.split(")")[0]
      ?.split(",")
      .map((v) => +v.trim());
    if ((rgba?.length ?? 0) >= 3 && rgba?.every((v) => Number.isFinite(v))) {
      let opacity = rgba[3] || 1;
      if (maxOpacity === "255" && opacity <= 1) {
        opacity = Math.max(1, Math.floor((1 / opacity) * 255));
      }
      const rgb = rgba.slice(0, 3) as [number, number, number];
      return [...rgb, opacity] as RGBA;
    }
    return [100, 100, 100, maxOpacity === "255" ? 255 : 1];
  }

  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(5, 2), 16);
  let a = parseInt(color.substr(7, 2), 16) || 1;

  if (maxOpacity === "255" && a <= 1) {
    a = Math.max(1, Math.floor((1 / a) * 255));
  }
  return [r, g, b, a];
};

export type RGBA = [number, number, number, number];
