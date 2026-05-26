import { isDefined } from "../../../utils/utils";
import type { UIDocElement } from "../../UIDocs";

export const getCommonViewHeaderUIDoc = (
  titleContentDescription: string,
  menu: {
    description: string;
    children: UIDocElement[];
    docs: string;
    title: string;
  },
  viewType: "table" | "sql" | "chart" | "method",
): UIDocElement => ({
  type: "section",
  selector: ".silver-grid-item-header",
  title: "Header section",
  description:
    "Contains menu button, title and window minimise/fullscreen controls.",
  children: (
    [
      viewType === "chart" ? undefined : (
        {
          type: "section",
          selectorCommand: "Window.W_QuickMenu",
          title: "Quick actions",
          description:
            "Quick actions for the view, providing easy access to charting and joins.",
          children: (
            [
              viewType === "sql" ? undefined : (
                {
                  selectorCommand: "dashboard.window.toggleFilterBar",
                  type: "button",
                  title: "Toggle filter bar",
                  description:
                    "Shows or hides the filter bar, allowing users to filter the data displayed in the table.",
                }
              ),
              viewType === "sql" ? undefined : (
                {
                  selectorCommand: "Window.W_QuickMenu.addCrossFilteredTable",
                  type: "button",
                  title: "Add cross-filtered table",
                  description:
                    "Adds a new table view that is cross-filtered by the current table. This allows you to explore related data in a new table view.",
                }
              ),

              {
                type: "button",
                selectorCommand: "AddChartMenu.Timechart",
                title: "Add timechart",
                description:
                  viewType === "sql" ?
                    "Adds a timechart visualization based on the current SQL statement. Visible only when the last executed statement returned at least one timestamp column."
                  : "Adds a timechart visualization based on the current table. Visible only when the current table (or any linked table) has a timestamp/date column.",
              },
              {
                type: "button",
                selectorCommand: "AddChartMenu.Map",
                title: "Add map",
                description:
                  viewType === "sql" ?
                    "Adds a map visualization based on the current SQL statement. Visible only when the last executed statement returned at least one geometry/geography column (postgis extension must be enabled)."
                  : "Adds a map visualization based on the current data. Visible only when the current table (or any linked table) has a geometry/geography column (postgis extension must be enabled).",
              },
            ] satisfies (UIDocElement | undefined)[]
          ).filter(isDefined),
        }
      ),
      {
        type: "drag-handle",
        direction: "x",
        selector: ".silver-grid-item-header--title",
        title: "View title. Drag to re-arrange layout",
        description: titleContentDescription,
      },
      {
        selectorCommand: "dashboard.window.collapse",
        type: "button",
        title: "Collapse the view",
        description:
          "Collapses the view, minimizing it to temporarily save space on the dashboard. ",
      },
      {
        selectorCommand: "dashboard.window.fullscreen",
        type: "button",
        title: "Fullscreen",
        description: "Expands the view to fill the entire screen.",
      },
      {
        selectorCommand: "dashboard.window.close",
        type: "button",
        title: "Remove view",
        description:
          viewType === "sql" ?
            "Removes the SQL editor from the dashboard. If there are unsaved changes, a confirmation dialog will appear."
          : "Removes the view from the dashboard.",
      },
      viewType !== "chart" ? undefined : (
        {
          type: "section",
          selectorCommand: "Window.ChildChart.toolbar",
          title: "Chart toolbar",
          description:
            "Toolbar for the chart view if not detached. By default, newly charts added will appear over the originating table/sql editor view. They can be detached to a separate window.",
          children: [
            {
              type: "popup",
              selectorCommand: "dashboard.window.chartMenu",
              title: "Chart menu",
              description: "Menu for the chart view.",
              children: [],
            },
            {
              selectorCommand: "dashboard.window.collapseChart",
              title: "Collapse chart",
              type: "button",
              description:
                "Collapses the chart window, minimizing it to save space on the dashboard. It can then be restored by clicking the chart icon in the SQL editor top left quick actions section.",
            },
            {
              selectorCommand: "dashboard.window.detachChart",
              title: "Detach chart",
              type: "button",
              description:
                "Detaches the chart from the parent view, allowing it to be moved and resized independently. It keeps the connection the originating table view to cross filter it.",
            },
            {
              selectorCommand: "dashboard.window.closeChart",
              title: "Close chart",
              type: "button",
              description:
                "Closes the chart view, returning to the originatine table/sql editor view.",
            },
          ],
        }
      ),
      {
        selectorCommand: "dashboard.window.menu",
        type: "popup",
        ...menu,
      },
    ] satisfies (UIDocElement | undefined)[]
  ).filter(isDefined),
});
