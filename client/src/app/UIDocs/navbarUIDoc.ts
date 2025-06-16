import type { UIDocNavbar } from "../UIDocs";
import { fixIndent, ROUTES } from "../../../../commonTypes/utils";

export const navbarUIDoc = {
  type: "navbar",
  selectorCommand: "NavBar",
  title: "Core concepts",
  description: fixIndent(`
    After installation and initial setup, you will see main Prostgles UI interface where you can add and open connections.

    ## Connections

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
`),
  children: [
    {
      type: "link",
      pagePath: ROUTES.CONNECTIONS,
      selector: ".prgl-brand-icon",
      title: "Home",
      description: "Navigate to the home page (connection list). ",
    },
    {
      type: "link",
      pagePath: ROUTES.CONNECTIONS,
      selector: '[href="/connections"]',
      title: "Connections",
      description: "Manage database connections",
    },
    {
      type: "link",
      pagePath: ROUTES.USERS,
      selector: '[href="/users"]',
      title: "Users",
      description: "Manage user accounts (admin only)",
    },
    {
      type: "link",
      pagePath: ROUTES.SERVER_SETTINGS,
      selector: '[href="/server-settings"]',
      title: "Server Settings",
      description: "Configure server settings (admin only)",
    },
    {
      type: "link",
      pagePath: ROUTES.ACCOUNT,
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
