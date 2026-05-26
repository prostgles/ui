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

  const stops = [
    { offset: 0.0, opacity: 0.5 },
    { offset: 0.2, opacity: 0.4 },
    { offset: 0.3, opacity: 0.3 },
    { offset: 0.4, opacity: 0.2 },
    { offset: 0.5, opacity: 0.1 },
    { offset: 0.7, opacity: 0.02 },
    { offset: 0.8, opacity: 0 },
  ];

  return {
    peakSections: [coords.map(([x, y], index) => ({ x, y, index }))],
    minY,
    stops,
  };
};
