import { fixIndent, ROUTES } from "../../../../../commonTypes/utils";
import { getCommandElemSelector } from "../../../Testing";
import type { UIDocContainers } from "../../UIDocs";
import { AIAssistantUIDoc } from "./AIAssistantUIDoc";
import { dashboardMenuUIDoc } from "./dashboard/dashboardMenuUIDoc";
import { dashboardContentUIDoc } from "./dashboard/dashboardContentUIDoc";

export const dashboardUIDoc = {
  type: "page",
  path: ROUTES.CONNECTIONS,
  pathItem: {
    tableName: "connections",
    selectorCommand: "Connection.openConnection",
  },
  title: "Dashboard",
  description: fixIndent(`
    Main interface for interacting with a selected database connection. 
    Browse data, execute SQL queries, manage database objects, and access various tools.
    
    <img src="/screenshots/dashboard.svg" alt="Connection dashboard" />
    `),
  children: [
    dashboardMenuUIDoc,
    {
      type: "button",
      title: "Toggle dashboard menu",
      description:
        "Opens or closes the dashboard menu unless the menu is pinned.",
      selector: getCommandElemSelector("dashboard.menu"),
    },
    {
      type: "link",
      title: "Go to configuration",
      description: "Opens the configuration page for the selected connection.",
      selector: getCommandElemSelector("dashboard.goToConnConfig"),
      path: ROUTES.CONFIG,
      pathItem: {
        tableName: "connections",
      },
    },
    {
      type: "input",
      inputType: "select",
      title: "Change connection",
      description: "Changes the current connection.",
      selector: getCommandElemSelector("ConnectionSelector"),
    },
    {
      type: "select",
      title: "Workspaces",
      description:
        "List of available workspaces for the selected connection. Each workspace represents a separate environment for data analysis",
      selector: getCommandElemSelector("WorkspaceMenu.list"),
    },
    {
      type: "popup",
      selector: getCommandElemSelector("WorkspaceMenuDropDown"),
      title: "Workspaces menu",
      description:
        "Opens the workspaces menu, allowing you to create, manage, and switch between workspaces.",
      docs: fixIndent(`
        Workspaces are a powerful feature that allows you to organize your work within a connection.
        The opened views and their layout is saved to the workspace, so you can switch between different sets of data and configurations without losing your progress.

        The workspaces menu provides access to all available workspaces for the selected connection. You can create new workspaces, switch between existing ones, and manage workspace settings.
        Each workspace allows you to work with a separate set of data and configurations, making it easier to organize your work and collaborate with others.
        The menu also includes options to clone existing workspaces and delete them if they are no longer needed.
      `),
      children: [
        {
          type: "list",
          title: "Workspaces",
          description:
            "List of available workspaces. Click to switch to a different workspace.",
          selector: getCommandElemSelector("WorkspaceMenu.SearchList") + " ul",
          itemSelector: "li",
          itemContent: [
            {
              type: "popup",
              selector: getCommandElemSelector("WorkspaceDeleteBtn"),
              title: "Delete workspace",
              description: "Opens the delete workspace confirmation dialog",
              children: [
                {
                  type: "button",
                  title: "Delete workspace",
                  description:
                    "Confirms the deletion of the selected workspace.",
                  selector: getCommandElemSelector(
                    "WorkspaceDeleteBtn.Confirm",
                  ),
                },
              ],
            },
            {
              type: "button",
              selector: getCommandElemSelector("WorkspaceMenu.CloneWorkspace"),
              title: "Clone workspace",
              description:
                "Creates a copy of the selected workspace with a new name.",
            },
            {
              selector: getCommandElemSelector("WorkspaceSettings"),
              type: "smartform-popup",
              tableName: "workspaces",
              title: "Workspace settings",
              description:
                "Opens the settings for the selected workspace, allowing you to manage its properties.",
            },
          ],
        },
        {
          type: "popup",
          title: "Create new workspace",
          description:
            "Opens the form to create a new workspace for the selected connection.",
          selector: getCommandElemSelector(
            "WorkspaceMenuDropDown.WorkspaceAddBtn",
          ),
          children: [
            {
              type: "input",
              title: "Workspace name",
              description: "Name of the new workspace.",
              selector: getCommandElemSelector("WorkspaceAddBtn") + " input",
              inputType: "text",
            },
            {
              type: "button",
              title: "Create workspace",
              description:
                "Create and switch to the new workspace with the specified name.",
              selector: getCommandElemSelector("WorkspaceAddBtn.Create"),
            },
          ],
        },
      ],
    },
    dashboardContentUIDoc,
    AIAssistantUIDoc,
    {
      type: "popup",
      selector: getCommandElemSelector("Feedback"),
      title: "Feedback",
      description:
        "Opens the feedback form, allowing you to provide feedback about the application.",
      children: [],
    },
    {
      type: "link",
      selector: getCommandElemSelector("dashboard.goToConnections"),
      title: "Go to Connections",
      description: "Opens the connections list page.",
      path: ROUTES.CONNECTIONS,
    },
  ],
} satisfies UIDocContainers;
