import { isDefined } from "@common/filterUtils";

export const getTimechartGradientPeakSections = (
  coords: [number, number][],
  height: number,
) => {
  // Calculate minY for gradient positioning
  let minY = Infinity;
  coords.forEach(([_, y]) => {
    if (y < minY) minY = y;
  });

  const gradientLastStep = 0.3;
  const gradientMaxY = height - gradientLastStep * height;
  const peakSections: { x: number; y: number; index: number }[][] = [];

  coords.forEach(([x, y], index) => {
    if (y > gradientMaxY) {
      return;
    }

    const nextPoint = coords[index + 1];
    const prevPoint = coords[index - 1];
    const currentSection = peakSections.at(-1);
    const currentSectionLastPoint = currentSection?.at(-1);
    if (
      !currentSection ||
      !currentSectionLastPoint ||
      index !== currentSectionLastPoint.index + 1
    ) {
      peakSections.push(
        [
          prevPoint && {
            index: index - 1,
            x: prevPoint[0],
            y: prevPoint[1],
          },
          { x, y, index },
          nextPoint && nextPoint[1] > gradientMaxY ?
            {
              index: index + 1,
              x: nextPoint[0],
              y: nextPoint[1],
            }
          : undefined,
        ].filter(isDefined),
      );
    } else {
      currentSection.push({ x, y, index });
      if (nextPoint && nextPoint[1] > gradientMaxY) {
        currentSection.push({
          x: nextPoint[0],
          y: nextPoint[1],
          index: index + 1,
        });
      }
    }
  });

  return { peakSections, minY, gradientLastStep };
};
