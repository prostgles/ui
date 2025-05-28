import {
  getCommandElemSelector,
  getDataKeyElemSelector,
} from "../../../../Testing";
import type { UIDocElement } from "../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../getCommonViewHeaderUIDoc";

export const mapUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="map"]`,
  title: "Map view",
  description:
    "Displays a map visualization based on the Table/SQL query results.",
  children: [
    getCommonViewHeaderUIDoc(
      "Shows the table/view name together with the geometry/geography column name used for the map visualization.",
      {
        description: "Data refresh and display options.",
        children: [
          {
            type: "tab",
            selector:
              getCommandElemSelector("MenuList") +
              " " +
              getDataKeyElemSelector("Data refresh"),
            title: "Data refresh",
            description:
              "Allows setting subscriptions or data refresh rates. By default every table subscribes to data changes.",
            children: [],
          },
          {
            type: "tab",
            selector:
              getCommandElemSelector("MenuList") +
              " " +
              getDataKeyElemSelector("Basemap"),
            title: "Basemap",
            description: "Allows setting the map tiles and projection.",
            children: [
              {
                type: "select",
                selectorCommand: "MapBasemapOptions.Projection",
                title: "Projection",
                description:
                  "Allows setting the map projection: Mercator (default) or Orthographic (allows a setting custom tile image for plan drawings).",
              },
            ],
          },
          {
            type: "tab",
            selector:
              getCommandElemSelector("MenuList") +
              " " +
              getDataKeyElemSelector("Layers"),
            title: "Layers",
            description:
              "Allows setting the map layers data source and style. The map supports multiple layers.",
            children: [],
          },
          {
            type: "tab",
            selector:
              getCommandElemSelector("MenuList") +
              " " +
              getDataKeyElemSelector("Settings"),
            title: "Settings",
            description:
              "Allows setting the map layout options: aggregation limit, click behavior, etc.",
            children: [],
          },
        ],
      },
      "chart",
    ),
    {
      type: "section",
      selector: ".Window",
      title: "Map window with controls",
      description:
        "Map visualization and controls for interacting with the map.",
      children: [
        {
          type: "popup",
          selectorCommand: "ChartLayerManager",
          title: "Map layer manager",
          description:
            "Allows adding/removing layers to the map. Each layer can be configured with its own data source and style.",
          children: [
            {
              type: "select",
              selectorCommand: "ChartLayerManager.AddChartLayer.addLayer",
              title: "Add layer",
              description:
                "Allows adding a new layer to the map. The available options are all the tables that have geometry or geography columns.",
            },
            {
              type: "popup",
              selectorCommand: "ChartLayerManager.AddChartLayer.addOSMLayer",
              title: "Add OSM layer",
              description:
                "Allows adding a new layer based on OpenStreetMap data. This is useful for displaying additional map data like roads, restaurants, etc.",
              children: [],
            },
            {
              type: "popup",
              selectorCommand: "MapBasemapOptions",
              title: "Map basemap options",
              description: "Allows setting the map tiles and projection.",
              children: [],
            },
            {
              selectorCommand: "MapOpacityMenu",
              type: "section",
              title: "Map opacity options",
              description: "Allows setting the opacity of the map layers.",
              children: [],
            },
          ],
        },
        {
          type: "button",
          selectorCommand: "InMapControls.showCursorCoords",
          title: "Show cursor coordinates",
          description:
            "Toggle displays the current cursor coordinates on the map. ",
        },
        {
          type: "select",
          selectorCommand: "MapExtentBehavior",
          title: "Map extent behavior",
          description:
            "Allows setting the map extent and auto-zoom behavior: Follow data, Follow map or Free roam.",
        },
        {
          type: "button",
          selectorCommand: "InMapControls.goToDataBounds",
          title: "Zoom to data",
          description:
            "Zooms the map to fit the bounds of the data currently displayed.",
        },
        {
          type: "select",
          selectorCommand: "DeckGLFeatureEditor",
          title: "Add new feature",
          description:
            "Allows drawing and inserting a new feature: Point, Line or Polygon.",
        },
      ],
    },
  ],
} satisfies UIDocElement;
