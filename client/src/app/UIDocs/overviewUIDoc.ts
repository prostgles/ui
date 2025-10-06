import type { UIDoc } from "../UIDocs";

export const overviewUIDoc = {
  type: "info",
  title: "Overview",
  description: "Overview",
  docs: `
    Prostgles UI is a user-friendly way for interacting with PostgreSQL, creating dashboards and internal tools.

    <img src="/screenshots/sql_editor.svgif.svg" alt="Prostgles UI Overview" width="100%" />
    <img src="/screenshots/dashboard.svgif.svg" alt="Prostgles UI Overview" width="100%" />

    <img src="/screenshots/schema_diagram.svg" alt="Prostgles UI Overview" width="100%" />
    <img src="/screenshots/postgis_map.svg" alt="Prostgles UI Overview" width="100%" />
    <img src="/screenshots/ai_assistant.svgif.svg" alt="Prostgles UI Overview" width="100%" />

    ## Features
    - SQL Editor with syntax highlighting and auto-completion
    - Real-time dashboards with charts
    - AI assistant with MCP support
    - User authentication (email, third-party OAuth and two-factor authentication)
    - Role-based access control
    - Database management
    - File storage and management
    - API integration

    It comes in two versions: 
    - **Prostgles UI** - a web-based application with the complete feature set accessible through any modern browser.
    - **Prostgles Desktop** - a native desktop application based on Electron available for Linux, MacOS and Windows. 
    It has a subset of the core features from Prostgles UI for data exploration and database management. 
    User Management and other multi-user focused features are not available in the desktop version.
  `,
  docOptions: "asSeparateFile",
} as const satisfies UIDoc;
