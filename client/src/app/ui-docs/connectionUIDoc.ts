import { getCommandElemSelector } from "../../Testing";
import type { UIDocContainers } from "../UIDocs";

export const connectionsUIDoc = {
  type: "page",
  path: "connections/:connectionId",
  title: "Database Workspace",
  description:
    "Main interface for interacting with a selected database connection. Browse data, execute SQL queries, manage database objects, and access various tools.",
  children: [
    {
      type: "button",
      title: "Toogle menu",
      description:
        "Opens or closes the dashboard menu unless the menu is pinned.",
      selector: getCommandElemSelector("dashboard.menu"),
    },
    {
      type: "button",
      title: "Go to configuration",
      description: "Opens the configuration page for the selected connection.",
      selector: getCommandElemSelector("dashboard.goToConnConfig"),
    },
    {
      type: "input",
      inputType: "select",
      title: "Change connection",
      description: "Changes the current connection.",
      selector: getCommandElemSelector("ConnectionSelector"),
    },
    {
      type: "select-list",
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
    {
      type: "popup",
      selector: getCommandElemSelector("AskLLM"),
      title: "Ask AI",
      description:
        "Opens an AI assistant to help generate SQL queries, understand database schema, or perform other tasks.",
      children: [
        {
          type: "smartform-popup",
          selector: getCommandElemSelector("LLMChatOptions.toggle"),
          title: "Chat settings",
          tableName: "llm_chats",
          description:
            "Allows editing all chat settings and data as well deleting or cloning the current chat.",
        },
        {
          type: "input",
          inputType: "select",
          selector: getCommandElemSelector("LLMChat.select"),
          title: "Select chat",
          description:
            "Selects a chat from the list of available chats. Each chat represents a separate conversation with the AI assistant.",
        },
        {
          type: "button",
          selector: getCommandElemSelector("AskLLMChat.NewChat"),
          title: "New chat",
          description: "Creates a new chat with the AI assistant.",
        },
      ],
    },
  ],
} satisfies UIDocContainers;
