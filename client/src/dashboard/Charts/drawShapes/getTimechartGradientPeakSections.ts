export const getTimechartGradientPeakSections = (
  coords: [number, number][],
) => {
  // Calculate minY for gradient positioning
  let minY = Infinity;
  let maxY = -Infinity;
  coords.forEach(([_, y]) => {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  // const height = maxY;

  const stops = [
    { offset: 0.0, opacity: 0.5 },
    { offset: 0.2, opacity: 0.4 },
    { offset: 0.3, opacity: 0.3 },
    { offset: 0.4, opacity: 0.2 },
    { offset: 0.5, opacity: 0.1 },
    { offset: 0.7, opacity: 0.02 },
    { offset: 0.8, opacity: 0 },
  ];
  // const gradientLastStep = stops.at(-1)!.offset;
  // const gradientMaxY = gradientLastStep * height;

  // const peakSections: { x: number; y: number; index: number }[][] = [];
  // coords.forEach(([x, y], index) => {
  //   if (y > gradientMaxY) {
  //     return;
  //   }

  //   const nextPoint = coords[index + 1];
  //   const prevPoint = coords[index - 1];
  //   const currentSection = peakSections.at(-1);
  //   const currentSectionLastPoint = currentSection?.at(-1);
  //   if (
  //     !currentSection ||
  //     !currentSectionLastPoint ||
  //     index !== currentSectionLastPoint.index + 1
  //   ) {
  //     peakSections.push(
  //       [
  //         prevPoint && {
  //           index: index - 1,
  //           x: prevPoint[0],
  //           y: prevPoint[1],
  //         },
  //         { x, y, index },
  //         nextPoint && nextPoint[1] > gradientMaxY ?
  //           {
  //             index: index + 1,
  //             x: nextPoint[0],
  //             y: nextPoint[1],
  //           }
  //         : undefined,
  //       ].filter(isDefined),
  //     );
  //   } else {
  //     currentSection.push({ x, y, index });
  //     if (nextPoint && nextPoint[1] > gradientMaxY) {
  //       currentSection.push({
  //         x: nextPoint[0],
  //         y: nextPoint[1],
  //         index: index + 1,
  //       });
  //     }
  //   }
  // });

  return {
    peakSections: [coords.map(([x, y], index) => ({ x, y, index }))],
    minY,
    stops,
  };
};
