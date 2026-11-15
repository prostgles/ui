import { MVTWriter } from "../../../client/node_modules/@loaders.gl/mvt/dist/index.js";

export const createVectorBasemapFixture = () => {
  const layers = [
    {
      name: "water_polygons",
      properties: { kind: "river" },
      geometry: rectangle(0, 0, 1, 1),
    },
    {
      name: "water_lines",
      properties: { kind: "river" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0.6],
          [1, 0.6],
        ],
      },
    },
    {
      name: "buildings",
      properties: { dummy: 1 },
      geometry: rectangle(0.45, 0.35, 0.55, 0.65),
    },
    {
      name: "streets",
      properties: { kind: "rail", rail: true, bridge: true },
      geometry: {
        type: "LineString",
        coordinates: [
          [0.5, 0.1],
          [0.5, 0.9],
        ],
      },
    },
    {
      name: "bridges",
      properties: { kind: "bridge" },
      geometry: rectangle(0.45, 0.1, 0.55, 0.9),
    },
    {
      name: "ferries",
      properties: { kind: "ferry" },
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0.5],
            [1, 0.5],
          ],
          [
            [0, 0.75],
            [1, 0.75],
          ],
        ],
      },
    },
    ...[
      {
        name: "Station Road",
        coordinates: [
          [0.1, 0.82],
          [0.25, 0.67],
          [0.4, 0.52],
        ],
      },
      {
        name: "Reversed Street",
        coordinates: [
          [0.9, 0.82],
          [0.6, 0.66],
        ],
      },
      {
        name: "Too short to fit",
        coordinates: [
          [0.8, 0.1],
          [0.81, 0.11],
        ],
      },
    ].map(({ name, coordinates }) => ({
      name: "street_labels",
      properties: { name, kind: "residential" },
      geometry: { type: "LineString", coordinates },
    })),
    ...[
      { name: "Milton Keynes", population: 229_941, x: 0.5, y: 0.43 },
      { name: "Milton Keynes", population: 229_941, x: 0.52, y: 0.44 },
      { name: "Nearby town", population: 20_000, x: 0.51, y: 0.43 },
      { name: "Overlapping town", population: 25_000, x: 0.69, y: 0.43 },
      { name: "Harpenden", population: 30_000, x: 0.97, y: 0.05 },
      { name: "Welwyn Garden City", population: 50_000, x: 0.03, y: 0.05 },
    ].map(({ name, population, x, y }) => ({
      name: "place_labels",
      properties: {
        name,
        population,
        kind: population >= 100_000 ? "city" : "town",
      },
      geometry: { type: "Point", coordinates: [x, y] },
    })),
  ];

  const layersByName = new Map<string, typeof layers>();
  for (const layer of layers) {
    const layerFeatures = layersByName.get(layer.name) ?? [];
    layerFeatures.push(layer);
    layersByName.set(layer.name, layerFeatures);
  }

  return Buffer.concat(
    Array.from(layersByName, ([name, layerFeatures]) =>
      Buffer.from(
        MVTWriter.encodeSync(
          layerFeatures.map(({ properties, geometry }) => ({
            type: "Feature",
            properties,
            geometry,
          })),
          { mvt: { layerName: name } },
        ),
      ),
    ),
  );
};

const rectangle = (
  left: number,
  top: number,
  right: number,
  bottom: number,
) => ({
  type: "Polygon",
  coordinates: [
    [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
      [left, top],
    ],
  ],
});
