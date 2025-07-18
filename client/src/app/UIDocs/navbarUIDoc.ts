import { ROUTES } from "../../../../commonTypes/utils";
import type { UIDocNavbar } from "../UIDocs";

export const navbarUIDoc = {
  type: "navbar",
  selectorCommand: "NavBar",
  title: "Navigation and core concepts",
  description:
    "There are three core concepts and UI sections in Prostgles UI: Connections, Dashboard, and Workspace.",
  docs: `
    After installation and initial setup, you will see main Prostgles UI interface where you can add and open connections.

    ## Connection

    A connection represents a unique postgres database instance (unique host, port, user and database name).
    
    ## Dashboard

    Clicking a connection will take you to the dashboard page where you can explore and interact with the database throught 
    the available views like SQL Editor, Table, Map, Schema Diagram, AI Assistant, and more.

    ## Workspace
    
    The views you open in the dashboard are saved automatically to the current workspace.
    This allows you to return to the same views later, even after closing the application.

    ## Top Navigation Bar

    The top navigation bar provides quick access to all major sections of Prostgles UI. 
    Located at the top of the interface, it allows you to switch between database connections, manage users and server settings, and access your account preferences. 
    The navigation adapts to your user role, showing admin-only sections like Users and Server Settings only to authorized users.
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
      title: "Go to Connections",
      description: "Manage database connections",
    },
    {
      type: "link",
      path: ROUTES.USERS,
      selector: '[href="/users"]',
      title: "Go to Users",
      description: "Manage user accounts (admin only)",
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
      title: "Go to Server Settings",
      description: "Configure server settings (admin only)",
    },
    {
      type: "link",
      path: ROUTES.ACCOUNT,
      title: "Go to Account",
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
    },
    {
      type: "select",
      selectorCommand: "App.LanguageSelector",
      title: "Language Selector",
      description: "Change the interface language",
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
