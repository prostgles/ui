import { fixIndent } from "../../../../demo/scripts/sqlVideoDemo";
import { getCommandElemSelector } from "../../../../Testing";
import type { UIDocElement } from "../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../getCommonViewHeaderUIDoc";

export const timechartUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="timechart"]`,
  title: "Timechart view",
  description: "Displays a timechart based on the Table/SQL query results.",
  docs: `
    The timechart view allows you to visualize time-series data from your database.
    It supports multiple layers, each with its own data source and style.
    You can add filters to the timechart to narrow down the data displayed.

    <img src="./screenshots/timechart.svg" alt="Timechart view screenshot" />
  
    ## Components
    `,
  docOptions: "asSeparateFile",
  children: [
    getCommonViewHeaderUIDoc(
      "Shows the table/view name together with the number of records matching the current filters.",
      {
        description: "Timechart view menu",
        children: [],
        title: "Timechart view menu",
        docs: fixIndent(`
          The timechart view menu provides options for configuring the timechart.
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
                  title: "Aggregation options",
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
