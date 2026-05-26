import type { UIDoc } from "../UIDocs";

export const overviewUIDoc = {
  type: "info",
  title: "Overview",
  description: "Overview",
  docs: `
    Prostgles UI is a user-friendly way for interacting with PostgreSQL, creating dashboards and internal tools.

    <img src="./screenshots/overview.svgif.svg" alt="Prostgles UI Overview" width="100%" />

    ## Features
    - SQL Editor with syntax highlighting and auto-completion
    - Real-time dashboards with charts
    - AI assistant with MCP support
    - User authentication (email, third-party OAuth and two-factor authentication)
    - Role-based access control
    - Database management
    - File storage and backups (locally or to AWS S3 compatible storage)
    - TypeScript API with database schema types and end to end type safety
    - LISTEN NOTIFY support
    - Mobile friendly

    It comes in two versions: 
    - **Prostgles UI** - a web-based application with the complete feature set accessible through any modern browser.
    - **Prostgles Desktop** - a native desktop application based on Electron available for Linux, MacOS and Windows. 
    It has a subset of the core features from Prostgles UI for data exploration and database management. 
    User Management and other multi-user focused features are not available in the desktop version.
  `,
  docOptions: "asSeparateFile",
} as const satisfies UIDoc;
