import { mdiServerSecurity, mdiTools } from "@mdi/js";
import { ROUTES } from "@common/utils";
import { getCommandElemSelector, getDataKeyElemSelector } from "../../Testing";
import type { UIDocContainers } from "../UIDocs";

export const serverSettingsUIDoc = {
  type: "page",
  path: ROUTES.SERVER_SETTINGS,
  iconPath: mdiServerSecurity,
  title: "Server Settings",
  description:
    "Server Settings. Configure security, authentication, and LLM settings.",
  docs: `
    Manage server settings to enhance security, configure authentication methods, and set up LLM providers.
    <img src="./screenshots/server_settings.svg" alt="Server Settings" />
  `,
  children: [
    {
      type: "tab",
      selector: getDataKeyElemSelector("security"),
      title: "Security",
      description:
        "Security. Configure domain access, IP restrictions, session duration, and login rate limits to enhance security.",
      children: [
        {
          type: "smartform",
          title: "Settings form",
          description: "Configure server settings.",
          selectorCommand: "SmartForm",
          tableName: "server_settings",
        },
      ],
    },
    {
      type: "tab",
      title: "Authentication",
      selector: getDataKeyElemSelector("auth"),
      description:
        "Manage user authentication methods, default user roles, and third-party login providers to control access.",
      children: [
        {
          type: "input",
          title: "Website URL",
          inputType: "text",
          selector: getCommandElemSelector("AuthProviderSetup.websiteURL"),
          description:
            "Website URL. Used for email and third-party login redirect URL. When first visiting the app as an admin user, it is automatically set to the current URL which will trigger a page refresh.",
        },
        {
          type: "input",
          title: "Default user type",
          inputType: "select",
          selector: getCommandElemSelector("AuthProviderSetup.defaultUserType"),
          description:
            "The default user type assigned to new users. Defaults to 'default'.",
        },
        {
          type: "accordion-item",
          title: "Email signup",
          description: "Email signup/magic-link authentication setup.",
          selector: getCommandElemSelector("EmailAuthSetup"),
          docs: `
            Provide SMTP or AWS SES credentials to enable email signup and magic-link authentication. 
            By default users authenticate using a password.`,
          children: [
            {
              type: "input",
              title: "Enable/Disable email signup toggle",
              inputType: "checkbox",
              selector: getCommandElemSelector("EmailAuthSetup.toggle"),
              description:
                "Enable email signup. This will allow users to sign up and log in using their email address.",
            },
            {
              type: "input",
              title: "Signup type",
              inputType: "select",
              selector: getCommandElemSelector("EmailAuthSetup.SignupType"),
              description:
                "Signup type. Choose between 'withPassword' or 'withMagicLink'.",
            },
            {
              type: "popup",
              title: "Email verification",
              selector: getCommandElemSelector("EmailSMTPAndTemplateSetup"),
              description: "SMTP and email template setup.",
              children: [
                {
                  type: "accordion-item",
                  title: "Email provider setup",
                  selector: getCommandElemSelector("EmailSMTPSetup"),
                  description:
                    "SMTP settings for sending registration/magic-link emails. Allowed providers: SMTP (host, port, username, password) or AWS SES (region, accessKeyId, secretAccessKey).",
                  children: [],
                },
                {
                  type: "accordion-item",
                  title: "Email Template setup",
                  selector: getCommandElemSelector("EmailTemplateSetup"),
                  description:
                    "Email template for registration/magic-link emails",
                  children: [],
                },
                {
                  type: "button",
                  title: "Test and save",
                  selector: getCommandElemSelector(
                    "EmailSMTPAndTemplateSetup.save",
                  ),
                  description:
                    "Test and Save SMTP and email template settings.",
                },
              ],
            },
          ],
        },
        {
          type: "list",
          title: "Third-party login providers",
          description: "Third-party login providers (OAuth2)",
          selectorCommand: "AuthProviders.list",
          itemSelector:
            getCommandElemSelector("AuthProviders.list") + " > .Section",
          itemContent: [],
        },
      ],
    },
    {
      type: "tab",
      iconPath: mdiTools,
      title: "MCP Servers",
      selector: getDataKeyElemSelector("mcpServers"),
      description:
        "Manage MCP servers and tools that can then be used in the Ask AI chat",
      children: [],
    },
    {
      type: "tab",
      title: "LLM Providers",
      selector: getDataKeyElemSelector("llmProviders"),
      description:
        "Manage LLM providers, credentials and models to be used in the Ask AI chat",
      children: [],
    },
    {
      type: "tab",
      title: "Services",
      selector: getDataKeyElemSelector("services"),
      description: "Manage services",
      children: [],
    },
  ],
} satisfies UIDocContainers;
