import { isDefined } from "src/utils/utils";

/**
 *   'rgba(255, 0, 0, 0.21) 0px 1px 2px 0px'
 *     or
 *   'rgba(255, 0, 0) 0px 1px 2px 0px'
 */
export const getBoxShadowAsDropShadow = (style: CSSStyleDeclaration) => {
  if (!style.boxShadow || style.boxShadow === "none") return;
  const boxShadows = style.boxShadow
    .split("rgb")
    .filter((v) => v)
    .map((v) => "rgb" + v.trim())
    .map((v) => (v.endsWith(",") ? v.slice(0, -1) : v));

  const parsedBoxShadows = boxShadows
    .map((boxShadow) => {
      const [colorPart, offsetParts = ""] = boxShadow.split(")");
      const color = colorPart + ")";
      const offsets = offsetParts
        .split(" ")
        .map((v) => v.trim())
        .filter((v) => v);

      const offsetValues = offsets.map((v) => parseFloat(v));
      if (offsetValues.slice(0, 3).filter((v) => v === 0).length >= 3) {
        return;
      }
      return {
        color,
        offsets,
        offsetValues,
      };
    })
    .filter(isDefined);

  const filterParts = parsedBoxShadows.slice().map(
    ({ color, offsets }) =>
      `drop-shadow(${offsets
        .slice(0, 3)
        .map((part, index) => {
          if (index === 2 && part.endsWith("px")) {
            // reduce blur radius due to SVG rendering differences
            return `${(parseFloat(part) * 0.5).toFixed(1)}px`;
          }
          return part;
        })
        .join(" ")} ${color})`,
  );
  const filter = filterParts.join(" ");
  return { filter, filterParts };
};
