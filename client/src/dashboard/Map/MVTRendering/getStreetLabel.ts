import type { Viewport } from "deck.gl";
import type { Feature } from "geojson";
import { getLabelBounds } from "./labelCollision";

export const getStreetLabel = (
  feature: Feature,
  project: (coordinates: number[]) => number[],
  viewport: Viewport,
  textWidth: number,
  textSize: number,
): Feature | undefined => {
  if (viewport.zoom < 12) return;
  const { geometry } = feature;
  const paths =
    geometry.type === "LineString" ? [geometry.coordinates]
    : geometry.type === "MultiLineString" ? geometry.coordinates
    : [];
  let placement: { feature: Feature; length: number } | undefined;
  for (const coordinates of paths) {
    const points = coordinates.map((position) => ({
      position,
      screen: project(position),
    }));
    let run: typeof points = [];
    const placeRun = () => {
      const first = run.at(0);
      const last = run.at(-1);
      if (!first || !last) return;
      const [startX = 0, startY = 0] = first.screen;
      const [endX = 0, endY = 0] = last.screen;
      const visibleRange = getVisibleLineRange(
        first.screen,
        last.screen,
        viewport,
      );
      if (!visibleRange) return;
      const [start, end] = visibleRange;
      const length = Math.hypot(endX - startX, endY - startY) * (end - start);
      if (length < textWidth + 8 || length <= (placement?.length ?? 0)) return;
      const middle = (start + end) / 2;
      const position = first.position.map(
        (value, index) =>
          value + ((last.position[index] ?? value) - value) * middle,
      );
      const [x = 0, y = 0] = position;
      if (x < 0 || x >= 1 || y < 0 || y >= 1) return;
      let angle = (Math.atan2(startY - endY, endX - startX) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      if (
        !getLabelBounds(
          project(position),
          textWidth,
          textSize * 1.2,
          viewport,
          angle,
        )
      )
        return;
      placement = {
        length,
        feature: {
          ...feature,
          geometry: { type: "Point", coordinates: position },
          properties: { ...feature.properties, labelAngle: angle },
        },
      };
    };
    for (const point of points) {
      const first = run.at(0);
      const previous = run.at(-1);
      if (first && previous) {
        const [startX = 0, startY = 0] = first.screen;
        const [endX = 0, endY = 0] = point.screen;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.hypot(deltaX, deltaY);
        const bends =
          !length ||
          run.some(({ screen: [x = 0, y = 0] }) => {
            const along =
              ((x - startX) * deltaX + (y - startY) * deltaY) / length;
            const distance =
              Math.abs((x - startX) * deltaY - (y - startY) * deltaX) / length;
            return along < 0 || along > length || distance > textSize / 3;
          });
        if (bends) {
          placeRun();
          run = [previous];
        }
      }
      run.push(point);
    }
    placeRun();
  }
  return placement?.feature;
};

const getVisibleLineRange = (
  first: number[],
  last: number[],
  viewport: Viewport,
) => {
  let start = 0;
  let end = 1;
  for (const [axis, limit] of [viewport.width, viewport.height].entries()) {
    const origin = first[axis] ?? 0;
    const delta = (last[axis] ?? 0) - origin;
    if (!delta) {
      if (origin < 0 || origin > limit) return;
      continue;
    }
    const near = -origin / delta;
    const far = (limit - origin) / delta;
    start = Math.max(start, Math.min(near, far));
    end = Math.min(end, Math.max(near, far));
    if (start >= end) return;
  }
  return [start, end] as const;
};
