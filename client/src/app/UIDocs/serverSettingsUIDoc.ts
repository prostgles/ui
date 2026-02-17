import { ROUTES } from "@common/utils";
import { mdiServerSecurity, mdiTools } from "@mdi/js";
import { getDataKey } from "../../Testing";
import type { UIDocContainers } from "../UIDocs";
import { authenticationUIDoc } from "./connection/config/authentication.UIDoc";

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
      selector: getDataKey("security"),
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
    authenticationUIDoc,
    {
      type: "tab",
      iconPath: mdiTools,
      title: "MCP Servers",
      selector: getDataKey("mcpServers"),
      description:
        "Manage MCP servers and tools that can then be used in the Ask AI chat",
      children: [],
    },
    {
      type: "tab",
      title: "LLM Providers",
      selector: getDataKey("llmProviders"),
      description:
        "Manage LLM providers, credentials and models to be used in the Ask AI chat",
      children: [],
    },
    {
      type: "tab",
      title: "Services",
      selector: getDataKey("services"),
      description: "Manage services",
      children: [],
    },
  ],
} satisfies UIDocContainers;
