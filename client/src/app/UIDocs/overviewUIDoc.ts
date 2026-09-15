import type { UIDoc } from "../UIDocs";

export const overviewUIDoc = {
  type: "info",
  title: "Overview",
  description: "Overview",
  docs: `
    Prostgles UI is a user-friendly way for interacting with PostgreSQL, creating dashboards and internal tools.

    <img src="./screenshots/overview.svgif.svg" alt="Prostgles UI Overview" width="100%" />

    ## Features
    - SQL editor with syntax highlighting and auto-completion
    - Real-time dashboards and charts
    - AI assistant with MCP support and agentic workflows
    - User authentication (email, third-party OAuth and two-factor authentication)
    - Role-based access control
    - Database management
    - File storage and backups (locally or to AWS S3 compatible storage)
    - TypeScript API with database schema types and end to end type safety
    - LISTEN NOTIFY support
    - Mobile friendly

    It comes in two versions: 
    - **Prostgles UI** - Web-based app with the full feature set, accessible from modern browsers.
    - **Prostgles Desktop** - Electron-based app for Linux, macOS, and Windows, focused on data exploration and database management.
  
    Note: Multi-user features such as User Management are not available in the desktop version.
  `,
  docOptions: "asSeparateFile",
} as const satisfies UIDoc;
