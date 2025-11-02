import { mdiAccountOutline, mdiApplicationBracesOutline } from "@mdi/js";
import { ROUTES } from "@common/utils";
import { getDataKeyElemSelector } from "../../Testing";
import type { UIDocContainers } from "../UIDocs";

export const accountUIDoc = {
  type: "page",
  path: ROUTES.ACCOUNT,
  title: "Account",
  iconPath: mdiAccountOutline,
  description:
    "Manage your account settings, security preferences, and API access.",
  docs: `
    Manage your account settings, security preferences, and API access.
    
    <img src="./screenshots/account.svgif.svg" alt="Account Page" />
  `,
  children: [
    {
      type: "tab",
      title: "Account details",
      selector: getDataKeyElemSelector("details"),
      description: "View and update your account information.",
      children: [
        {
          type: "smartform",
          title: "Account information",
          description:
            "View all account details and associated data (workspaces, dashboards, views, etc.)",
          tableName: "users",
          selectorCommand: "SmartForm",
        },
      ],
    },
    {
      type: "tab",
      title: "Security",
      selector: getDataKeyElemSelector("security"),
      description: "Manage your account security settings.",
      children: [
        {
          type: "popup",
          title: "Two-factor authentication",
          description:
            "Set up and manage two-factor authentication for enhanced security.",
          selectorCommand: "Setup2FA.Enable",
          children: [
            {
              type: "button",
              title: "Generate QR Code",
              description:
                "Generate a QR code to set up 2FA with your authenticator app.",
              selectorCommand: "Setup2FA.Enable.GenerateQR",
            },
            {
              type: "button",
              title: "Can't scan QR code",
              description:
                "View manual setup instructions if you can't scan the QR code.",
              selectorCommand: "Setup2FA.Enable.CantScanQR",
            },
            {
              type: "input",
              inputType: "text",
              title: "Confirm code",
              description:
                "Enter the code from your authenticator app to enable 2FA.",
              selectorCommand: "Setup2FA.Enable.ConfirmCode",
            },
            {
              type: "button",
              title: "Enable 2FA",
              description:
                "Complete the 2FA setup process by confirming the code.",
              selectorCommand: "Setup2FA.Enable.Confirm",
            },
            {
              type: "text",
              title: "Base64 secret",
              description:
                "Manual setup secret key for your authenticator app.",
              selectorCommand: "Setup2FA.Enable.Base64Secret",
            },
          ],
        },
        {
          type: "button",
          title: "Disable 2FA",
          description: "Turn off two-factor authentication for your account.",
          selectorCommand: "Setup2FA.Disable",
        },
        {
          type: "popup",
          title: "Change password",
          description: "Change your account password.",
          selectorCommand: "Account.ChangePassword",
          children: [],
        },
        {
          type: "list",
          title: "Active sessions",
          description: "View and manage your active web sessions.",
          selectorCommand: "Sessions",
          itemContent: [],
          itemSelector: ``,
        },
      ],
    },
    {
      type: "tab",
      title: "API",
      selector: getDataKeyElemSelector("api"),
      iconPath: mdiApplicationBracesOutline,
      description: "View and manage your API access settings.",
      children: [
        {
          type: "section",
          title: "API Details",
          description: "View your API credentials and configuration.",
          selectorCommand: "config.api",
          uiVersionOnly: true,
          children: [],
        },
      ],
    },
  ],
} satisfies UIDocContainers;
