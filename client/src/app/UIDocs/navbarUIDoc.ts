import type { UIDocNavbar } from "../UIDocs";
import { ROUTES } from "../../../../commonTypes/utils";

export const navbarUIDoc = {
  type: "navbar",
  selectorCommand: "NavBar",
  title: "Navigation Bar",
  description:
    "Quick access to various sections, including connections, users, server settings, and account management. It also includes theme and language selectors for customization.",
  children: [
    {
      type: "link",
      pagePath: ROUTES.CONNECTIONS,
      selector: ".prgl-brand-icon",
      title: "Home",
      description: "Navigate to the home page. ",
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
      title: "Mobile Menu",
      description: "Toggle the mobile navigation menu on smaller screens",
    },
  ],
  paths: [
    ROUTES.CONNECTIONS,
    ROUTES.USERS,
    ROUTES.SERVER_SETTINGS,
    ROUTES.ACCOUNT,
  ],
} satisfies UIDocNavbar;
