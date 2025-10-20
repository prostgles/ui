import { mdiThemeLightDark, mdiTranslate } from "@mdi/js";
import { ROUTES } from "../../../../common/utils";
import type { UIDocNavbar } from "../UIDocs";

export const navbarUIDoc = {
  type: "navbar",
  selectorCommand: "NavBar",
  title: "Navigation bar",
  description:
    "The top navigation bar provides quick access to all major sections of Prostgles UI.",
  docs: `
    The top navigation bar provides quick access to all major sections of Prostgles UI. 
    Located at the top of the interface, it allows you to switch between database connections, manage users and server settings, and access your account preferences. 
    The navigation adapts to your user role, showing admin-only sections like Users and Server Settings only to authorized users.

    Key sections of the app:

    ### Connections

    A connection represents a unique postgres database instance (unique host, port, user and database name).
    The connection list page shows all available connections you can access based on your user permissions.
    
    ### Connection dashboard

    Clicking a connection from the connection list will take you to the dashboard page where you can explore and interact with the database.
    Available views and tools include SQL Editor, Table, Map, Schema Diagram, AI Assistant, and more.

    ### Dashboard workspaces
    
    The views you open in the dashboard are saved automatically to the current workspace.
    This allows you to return to the same views later, even after closing the application.
    You can create multiple workspaces to organize your views by project, team, task, or any other criteria.

`,
  children: [
    // {
    //   type: "link",
    //   path: ROUTES.CONNECTIONS,
    //   selector: ".prgl-brand-icon",
    //   title: "Go to Homepage",
    //   description: "Navigate to the home page (connection list). ",
    // },
    {
      type: "link",
      path: ROUTES.CONNECTIONS,
      selector: '[href="/connections"]',
      title: "Connections",
      description: "Manage database connections",
    },
    {
      type: "link",
      path: ROUTES.USERS,
      selector: '[href="/users"]',
      title: "Users",
      description: "Manage user accounts (admin only)",
      docOptions: "hideChildren",
      pageContent: [
        {
          type: "input",
          inputType: "text",
          selectorCommand: "SearchList",
          title: "Search Users",
          description: "Search for users by name or email.",
        },
        {
          type: "smartform-popup",
          selectorCommand: "dashboard.window.rowInsertTop",
          title: "Create User",
          description: "Create a new user account.",
          tableName: "users",
        },
        {
          type: "list",
          selector: ".table-component",
          title: "User List",
          description: "List of all users in the system.",
          itemSelector: ".TableBody div[role='row']",
          itemContent: [
            {
              type: "smartform-popup",
              selectorCommand: "dashboard.window.viewEditRow",
              title: "Edit User",
              description: "Edit user details.",
              tableName: "users",
            },
          ],
        },
        {
          type: "button",
          selectorCommand: "Pagination.lastPage",
          title: "Go to Last Page",
          description: "Navigate to the last page of the user list.",
        },
      ],
    },
    {
      type: "link",
      path: ROUTES.SERVER_SETTINGS,
      selector: '[href="/server-settings"]',
      title: "Server Settings",
      description: "Configure server settings (admin only)",
    },
    {
      type: "link",
      path: ROUTES.ACCOUNT,
      title: "Account",
      selector: '[href="/account"]',
      description: "Manage your account",
    },
    {
      type: "button",
      title: "Logout",
      selectorCommand: "NavBar.logout",
      description: "Logout of your account",
    },
    {
      type: "select",
      selectorCommand: "App.colorScheme",
      title: "Theme Selector",
      description: "Switch between light and dark themes",
      iconPath: mdiThemeLightDark,
    },
    {
      type: "select",
      selectorCommand: "App.LanguageSelector",
      title: "Language Selector",
      description: "Change the interface language",
      iconPath: mdiTranslate,
    },
    {
      type: "button",
      selector: ".hamburger",
      title: "Toggle Menu (visible on small screens)",
      description: "Toggle the mobile navigation menu on smaller screens",
    },
  ],
  paths: [
    { route: ROUTES.CONNECTIONS, exact: true },
    ROUTES.USERS,
    ROUTES.SERVER_SETTINGS,
    ROUTES.ACCOUNT,
  ],
} satisfies UIDocNavbar;
