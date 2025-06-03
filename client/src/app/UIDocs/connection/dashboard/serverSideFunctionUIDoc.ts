import { fixIndent } from "../../../../demo/sqlVideoDemo";
import { getCommandElemSelector } from "../../../../Testing";
import type { UIDocElement } from "../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../getCommonViewHeaderUIDoc";

export const serverSideFunctionUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="method"]`,
  title: "Server-side function view",
  description: "Allows executing server-side functions and viewing results.",
  docs: fixIndent(`
    The server-side functions is an experimental feature that allows you to specify and execute server-side Typescript functions directly from the dashboard.`),
  children: [
    getCommonViewHeaderUIDoc(
      "Function name.",
      {
        description: "Timechart view menu",
        children: [],
        title: "Server-side function view menu",
        docs: fixIndent(`
          The server-side function view menu provides options for executing the function, viewing results, and managing function parameters.
          <img src="/screenshots/server-side-function-menu.svg" alt="Server-side function view menu screenshot" />
        `),
      },
      "chart",
    ),
    {
      type: "section",
      selector: ".Window",
      title: "Chart area with controls",
      description: "Timechart visualization.",
      children: [
        {
          type: "popup",
          selectorCommand: "ChartLayerManager",
          title: "Layer manager",
          description:
            "Allows adding/removing layers from the chart. Each layer can be configured with its own data source and style.",
          children: [
            {
              type: "list",
              selector: ".ChartLayerManager_LayerList",
              title: "Layer list",
              itemSelector: ".ChartLayerManager_LayerList > .LayerQuery",
              itemContent: [
                {
                  type: "popup",
                  title: "Layer color picker",
                  selectorCommand: "LayerColorPicker",
                  description:
                    "Allows setting the color for the layer. The color can be set for each column in the layer.",
                  children: [],
                },
                {
                  selector: `[title="Table name"]`,
                  type: "text",
                  title: "Table name",
                  description:
                    "The name of the table used for the layer. This is the table that contains the data for the layer.",
                },
                {
                  type: "popup",
                  selectorCommand: "TimeChartLayerOptions.aggFunc",
                  title: "Aggregation function",
                  description:
                    "Allows setting the y-axis options for the layer.",
                  children: [
                    {
                      type: "select",
                      selectorCommand: "TimeChartLayerOptions.aggFunc.select",
                      title: "Aggregation function",
                      description:
                        "Selects the aggregation function to be used for the layer. The available options are: Sum, Average, Min, Max, Count.",
                    },
                    {
                      type: "select",
                      selectorCommand: "TimeChartLayerOptions.numericColumn",
                      title: "Aggregation column",
                      description:
                        "Selects the numeric column to be used for the aggregation function. ",
                    },
                    {
                      type: "select",
                      selectorCommand: "TimeChartLayerOptions.groupBy",
                      title: "Group by",
                      description:
                        "Selects the column to group the data by. This is will create a line for each group by value.",
                    },
                    {
                      selectorCommand: "Popup.close",
                      type: "button",
                      title: "Close",
                      description: "Closes the aggregation function popup.",
                    },
                  ],
                },
                {
                  selectorCommand: "ChartLayerManager.toggleLayer",
                  type: "button",
                  title: "Toggle layer on/off",
                  description:
                    "Toggles the visibility of the layer on the chart. This allows you to hide or show the layer without removing it.",
                },
                {
                  selectorCommand: "ChartLayerManager.removeLayer",
                  type: "button",
                  title: "Remove layer",
                  description:
                    "Removes the layer from the chart. This will delete the layer and its configuration.",
                },
              ],
              description:
                "Displays the list of layers currently added to the chart. ",
            },
            {
              type: "select",
              selectorCommand: "ChartLayerManager.AddChartLayer.addLayer",
              title: "Add layer",
              description:
                "Allows adding a new layer to the chart. The available options are all the tables that have date or timestamp columns.",
            },
          ],
        },
        {
          type: "button",
          selectorCommand: "W_TimeChart.resetExtent",
          title: "Reset extent",
          description:
            "Resets the chart to the default extent, showing all data points. Visible when the chart was paned or zoomed.",
        },
        {
          type: "list",
          selector: ".W_TimeChartLayerLegend",
          title: "Layer legend",
          itemSelector: ".W_TimeChartLayerLegend_Item",
          itemContent: [],
          description:
            "Displays the layers currently added to the chart. Quick access to changing the layer color, aggregation type and group by.",
        },
        {
          type: "button",
          selectorCommand: "W_TimeChart.AddTimeChartFilter",
          title: "Add/Edit time filter",
          description:
            "Allows adding a time filter to the timechart. This will filter the data points based on the selected time range.",
        },
        {
          type: "canvas",
          selector: getCommandElemSelector("W_TimeChart") + " > .Canvas",
          title: "Timechart canvas",
          description:
            "Zoomable and pannable canvas that displays the timechart. It shows the data points based on the selected layers and filters. Clicking on a point will add a filter with that time bucket.",
        },
      ],
    },
  ],
} satisfies UIDocElement;
