import type { Viewport } from "deck.gl";

export const filterLabelCollisions = <
  Candidate extends { bounds: LabelBounds },
>(
  candidates: Candidate[],
): Candidate[] => {
  const acceptedBounds: LabelBounds[] = [];
  return candidates.filter(({ bounds }) => {
    if (
      acceptedBounds.some(
        (other) =>
          bounds.left < other.right &&
          bounds.right > other.left &&
          bounds.top < other.bottom &&
          bounds.bottom > other.top,
      )
    )
      return false;
    acceptedBounds.push(bounds);
    return true;
  });
};

export const getLabelBounds = (
  [x = 0, y = 0]: number[],
  width: number,
  height: number,
  viewport: Viewport,
  angle = 0,
): LabelBounds | undefined => {
  const radians = (angle * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const halfWidth = (width * cosine + height * sine) / 2 + 4;
  const halfHeight = (width * sine + height * cosine) / 2 + 4;
  if (
    x + halfWidth < 0 ||
    x - halfWidth > viewport.width ||
    y + halfHeight < 0 ||
    y - halfHeight > viewport.height
  )
    return;
  return {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - halfHeight,
    bottom: y + halfHeight,
  };
};

export type LabelBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
