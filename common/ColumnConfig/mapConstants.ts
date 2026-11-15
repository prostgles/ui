export const MapExtentBehaviorOptions = [
  {
    key: "autoZoomToData",
    label: "Follow data",
    subLabel: "Will zoom to data extent on data change",
  },
  {
    key: "filterToMapBounds",
    label: "Follow map",
    subLabel: "Filters data to map bounds",
  },
  {
    key: "freeRoam",
    label: "Free roam",
    subLabel: "Map bounds filter not applied",
  },
] as const;

export type MapExtentBehaviorOptions =
  (typeof MapExtentBehaviorOptions)[number]["key"];

export type Extent = [number, number, number, number];
