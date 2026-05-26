import { mdiMonitorDashboard } from "@mdi/js";
import { ROUTES } from "@common/utils";
import { getCommandElemSelector } from "../../../Testing";
import type { UIDocContainers } from "../../UIDocs";
import { AIAssistantUIDoc } from "./AIAssistantUIDoc";
import { dashboardContentUIDoc } from "./dashboard/dashboardContentUIDoc";
import { dashboardMenuUIDoc } from "./dashboard/dashboardMenuUIDoc";

export const dashboardUIDoc = {
  type: "page",
  path: ROUTES.CONNECTIONS,
  pathItem: {
    tableName: "connections",
    selectorCommand: "Connection.openConnection",
  },
  title: "Connection dashboard",
  description: "Database exploration and management interface",
  iconPath: mdiMonitorDashboard,
  docs: `
    The connection dashboard is your command center for exploring and managing your Postgres database. 
    Open tables, run SQL, visualize schema relationships, switch workspaces, and launch tools—all in one flexible, customizable workspace.
    With quick search, saved queries, AI-powered assistance, and instant access to every database object, the dashboard gives you a fast, intuitive way to navigate your data and build the tools you need.
    
    ## Features
    
    - **Unified workspace**: View tables, SQL editors, charts, and tools together in a flexible layout. Save and switch between different layouts and sets of opened views for different tasks or projects.
    - **AI Assistant**: Generate SQL, explore data, and get help directly within the dashboard.
    - **Flexible layout**: Drag, resize, and arrange views in a tiled layout to create a workspace that fits your needs.
    - **Global search**: Search across all tables, views, and functions in a single, fast search bar.
    - **Schema diagram**: Visualize relationships between tables and schemas to better understand your database structure.
    - **Import data**: Easily import data from CSV/JSON files into your database tables.

    <img src="./screenshots/dashboard.svgif.svg" alt="Connection dashboard" />

    ## Components
    `,
  childrenTitle: "Dashboard elements",
  children: [
    dashboardMenuUIDoc,
    {
      type: "button",
      title: "Dashboard menu toggle",
      description:
        "Opens or closes the dashboard menu unless the menu is pinned.",
      selectorCommand: "dashboard.menu",
    },
    {
      type: "link",
      title: "Go to configuration",
      description: "Opens the configuration page for the selected connection.",
      selectorCommand: "dashboard.goToConnConfig",
      path: ROUTES.CONFIG,
      pathItem: {
        tableName: "connections",
      },
    },
    {
      type: "input",
      inputType: "select",
      title: "Change connection",
      description: "Switch to a different database connection.",
      selectorCommand: "ConnectionSelector",
    },
    {
      type: "select",
      title: "Workspaces",
      description:
        "List of available workspaces for the selected connection. Each workspace stores opened views and their layout.",
      selectorCommand: "WorkspaceMenu.list",
    },
    {
      type: "popup",
      selectorCommand: "WorkspaceMenuDropDown",
      title: "Workspaces menu",
      description:
        "Opens the workspaces menu, allowing you to create, manage, and switch between workspaces.",
      docs: `
        Workspaces are a powerful feature that allows you to organize your work within a connection.
        The opened views and their layout is saved to the workspace, so you can switch between different sets of data and configurations without losing your progress.

        The workspaces menu provides access to all available workspaces for the selected connection. You can create new workspaces, switch between existing ones, and manage workspace settings.
        Each workspace allows you to work with a separate set of data and configurations, making it easier to organize your work and collaborate with others.
        The menu also includes options to clone existing workspaces and delete them if they are no longer needed.
      `,
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
              selectorCommand: "WorkspaceDeleteBtn",
              title: "Delete workspace",
              description: "Opens the delete workspace confirmation dialog",
              children: [
                {
                  type: "button",
                  title: "Delete workspace",
                  description:
                    "Confirms the deletion of the selected workspace.",
                  selectorCommand: "WorkspaceDeleteBtn.Confirm",
                },
              ],
            },
            {
              type: "button",
              selectorCommand: "WorkspaceMenu.CloneWorkspace",
              title: "Clone workspace",
              description:
                "Creates a copy of the selected workspace with a new name.",
            },
            {
              selectorCommand: "WorkspaceSettings",
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
          selectorCommand: "WorkspaceMenuDropDown.WorkspaceAddBtn",
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
              selectorCommand: "WorkspaceAddBtn.Create",
            },
          ],
        },
        {
          type: "button",
          selectorCommand: "WorkspaceMenu.toggleWorkspaceLayoutMode",
          title: "Toggle layout mode",
          description:
            "Switches between fixed and editable layout modes for the current workspace. Fixed mode locks the layout, preventing it from being changed by the user.",
        },
      ],
    },
    dashboardContentUIDoc,
    AIAssistantUIDoc,
    {
      type: "popup",
      selectorCommand: "Feedback",
      title: "Feedback",
      description:
        "Opens the feedback form, allowing you to provide feedback about the application.",
      children: [],
    },
    {
      type: "link",
      selectorCommand: "dashboard.goToConnections",
      title: "Go to Connections",
      description: "Opens the connections list page.",
      path: ROUTES.CONNECTIONS,
    },
  ],
} satisfies UIDocContainers;
